import Razorpay from "razorpay";
import { z } from "zod";
import { mysqlSessionUser, mysqlCreateOrder, guardOrigin, readBody, mysqlLimit } from "./customer.server";
import { queryRows, executeSql, mysqlTransaction } from "./mysql.server";
import { PaymentError, paymentService } from "./payment-service.server";
import { paymentSchema } from "./payment-schema.server";

let initialized: Promise<void> | undefined;

export function validatePaymentEnvironment() {
  if (process.env["RAZORPAY_ENABLED"] !== "true") return;
  const missing = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE", "APP_ORIGIN"]
    .filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Payments configuration missing: ${missing.join(", ")}`);
  if (process.env["NODE_ENV"] === "production" && !process.env["APP_ORIGIN"]?.startsWith("https://")) throw new Error("Payments require an HTTPS APP_ORIGIN in production.");
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(process.env["RAZORPAY_KEY_ID"]!)) throw new Error("Invalid Razorpay key ID format.");
  if ((process.env["RAZORPAY_WEBHOOK_SECRET"]?.length || 0) < 32) throw new Error("Use a 32+ character Razorpay webhook secret.");
}

async function service() {
  if (process.env["RAZORPAY_ENABLED"] !== "true") throw new PaymentError(503, "Online payments are not available right now.");
  validatePaymentEnvironment();
  initialized ??= (async () => {
    try {
      await queryRows("SELECT order_id FROM razorpay_checkouts LIMIT 0");
      await queryRows("SELECT event_id FROM razorpay_webhook_events LIMIT 0");
    } catch (error) {
      if ((error as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw error;
      for (const sql of paymentSchema) await executeSql(sql);
    }
  })().catch((error) => { initialized = undefined; throw error; });
  await initialized;
  const keyId = process.env["RAZORPAY_KEY_ID"]!;
  const secret = process.env["RAZORPAY_KEY_SECRET"]!;
  const gateway = new Razorpay({ key_id: keyId, key_secret: secret });
  // The installed official SDK exposes its Axios instance, but has no public timeout option.
  const transport = (gateway as unknown as { api?: { rq?: { defaults: { timeout: number } } } }).api?.rq;
  if (transport) transport.defaults.timeout = 15000;
  return paymentService({ query: queryRows, transaction: mysqlTransaction, gateway, keyId, secret });
}

export async function handlePaymentsRequest(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  try {
    if (path === "/api/payments/config" && request.method === "GET") return json({ enabled: process.env["RAZORPAY_ENABLED"] === "true" });
    if (path === "/api/payments/webhook") {
      if (request.method !== "POST") throw new PaymentError(405, "Method not allowed.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = request.body?.getReader();
      if (!reader) throw new PaymentError(400, "Missing webhook body.");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 262144) { await reader.cancel(); throw new PaymentError(413, "Webhook too large."); }
        chunks.push(value);
      }
      const payments = await service();
      return json(await payments.webhook(Buffer.concat(chunks), request.headers.get("x-razorpay-signature"),
        process.env["RAZORPAY_WEBHOOK_SECRET"]!, request.headers.get("x-razorpay-event-id")));
    }
    if (!["/api/payments/create-order", "/api/payments/verify", "/api/payments/status"].includes(path)) throw new PaymentError(404, "Not found.");
    if (request.method !== "POST") throw new PaymentError(405, "Method not allowed.");
    guardOrigin(request);
    const user = await mysqlSessionUser(request);
    if (!user) throw new PaymentError(401, "Please sign in before paying.");
    await mysqlLimit(`payments:${user.id}`, 120);
    const body = await readBody(request);
    const payments = await service();
    if (path === "/api/payments/create-order") {
      let orderId: string;
      if (body?.orderId) orderId = z.string().regex(/^SR-[A-Z0-9-]{1,37}$/).parse(body.orderId);
      else {
        const response = await mysqlCreateOrder(user, body, "payment");
        const saved = await response.json() as { order: { id: string } };
        orderId = saved.order.id;
      }
      return json(await payments.checkout(user.id, orderId));
    }
    if (path === "/api/payments/verify") {
      const input = z.object({ razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/), razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) }).parse(body);
      return json(await payments.verify(user.id, input));
    }
    const { orderId } = z.object({ orderId: z.string().regex(/^SR-[A-Z0-9-]{1,37}$/) }).parse(body);
    return json(await payments.status(user.id, orderId));
  } catch (error) {
    const status = error instanceof PaymentError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400
      : typeof (error as { status?: number })?.status === "number" ? (error as { status: number }).status : 503;
    // SDK errors may contain authorization/config/request details: log codes only.
    console.error("Payment API failed:", path, error instanceof PaymentError ? error.message : (error as { code?: string })?.code || "PAYMENT_SERVICE_ERROR");
    return json({ error: status === 400 ? error instanceof PaymentError ? error.message : "Invalid payment request."
      : status < 500 && error instanceof Error ? error.message : "Payment service is temporarily unavailable. Please retry or contact support." }, status);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
