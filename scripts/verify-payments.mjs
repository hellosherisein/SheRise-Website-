import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import ts from "typescript";

// No network, live keys, live database, or real charge is used in these tests.
const url = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const transpile = (file) =>
  ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const serviceUrl = url(transpile("src/server/payment-service.server.ts"));
const { paymentService, validSignature } = await import(serviceUrl);
const secret = "test-api-secret",
  webhookSecret = "test-webhook-secret-32-characters-long";
const sign = (value, key = secret) => createHmac("sha256", key).update(value).digest("hex");

function fixture() {
  let orders = [
    {
      id: 1,
      order_number: "SR-ONE",
      customer_id: 1,
      customer_name: "Test Customer",
      customer_email: "test@example.test",
      customer_mobile: "9876543210",
      grand_total: "270.00",
      payment_method: "RAZORPAY",
      payment_status: "PENDING",
      order_status: "NEW",
      customer_note: JSON.stringify({ donationAmount: 50, preview: false }),
    },
  ];
  let checkouts = [],
    payments = [],
    events = [];
  const remoteOrders = new Map(),
    remotePayments = new Map();
  let creates = 0,
    failPaymentWrite = false,
    tail = Promise.resolve();
  async function query(sql, params = []) {
    if (sql.includes("LIMIT 0")) return [];
    if (sql.includes("FROM orders WHERE order_number"))
      return structuredClone(
        orders.filter(
          (order) =>
            order.order_number === params[0] &&
            String(order.customer_id) === String(params[1]) &&
            !order.deleted_at,
        ),
      );
    if (sql.includes("FROM orders WHERE id"))
      return structuredClone(orders.filter((order) => order.id === params[0]));
    if (sql.includes("FROM razorpay_checkouts c"))
      return structuredClone(
        checkouts
          .filter(
            (entry) =>
              entry.gateway_order_id === params[0] &&
              (params.length < 2 || String(orders[0].customer_id) === String(params[1])),
          )
          .map((entry) => ({
            ...entry,
            order_number: orders[0].order_number,
            customer_id: orders[0].customer_id,
          })),
      );
    if (sql.includes("FROM razorpay_checkouts WHERE order_id"))
      return structuredClone(checkouts.filter((entry) => entry.order_id === params[0]));
    if (sql.includes("FROM payments WHERE CAST(gateway_payment_id AS BINARY)"))
      return structuredClone(
        payments.filter(
          (entry) => entry.gateway_payment_id === params[0] && entry.order_id === params[1],
        ),
      );
    if (sql.includes("FROM razorpay_webhook_events"))
      return structuredClone(events.filter((event) => event.event_id === params[0]));
    throw new Error(`Unexpected query: ${sql}`);
  }
  async function execute(sql, params) {
    if (sql.startsWith("CREATE TABLE")) return { affectedRows: 0 };
    if (sql.startsWith("INSERT INTO razorpay_checkouts")) {
      checkouts.push({
        order_id: params[0],
        key_id: params[1],
        amount_paise: params[2],
        currency: "INR",
        status: "created",
      });
      return {};
    }
    if (sql.startsWith("UPDATE razorpay_checkouts SET gateway_order_id")) {
      checkouts.find((entry) => entry.order_id === params[1]).gateway_order_id = params[0];
      return {};
    }
    if (sql.startsWith("UPDATE orders SET customer_note")) {
      orders.find((entry) => entry.id === params[1]).customer_note = params[0];
      return {};
    }
    if (sql.startsWith("UPDATE razorpay_checkouts SET status")) {
      Object.assign(
        checkouts.find((entry) => entry.order_id === params[3]),
        { status: params[0], gateway_payment_id: params[1], method: params[2] },
      );
      return {};
    }
    if (sql.startsWith("UPDATE orders SET payment_status")) {
      Object.assign(
        orders.find((entry) => entry.id === params[2]),
        { payment_status: params[0], customer_note: params[1] },
      );
      return {};
    }
    if (sql.startsWith("INSERT INTO payments")) {
      if (failPaymentWrite) throw new Error("Simulated payment persistence failure");
      const [
        order_id,
        transaction_id,
        gateway_payment_id,
        gateway_order_id,
        amount,
        status,
        gateway_response,
      ] = params;
      payments.push({
        id: payments.length + 1,
        order_id,
        transaction_id,
        gateway_payment_id,
        gateway_order_id,
        amount,
        status,
        gateway_response,
      });
      return {};
    }
    if (sql.startsWith("UPDATE payments SET status")) {
      payments.find((entry) => entry.id === params[1]).status = params[0];
      return {};
    }
    if (sql.startsWith("INSERT INTO razorpay_webhook_events")) {
      events.push({ event_id: params[0], payload_sha256: params[1] });
      return {};
    }
    throw new Error(`Unexpected write: ${sql}`);
  }
  function transaction(work) {
    const result = tail.then(async () => {
      const before = structuredClone({ orders, checkouts, payments, events });
      try {
        return await work({
          query: async (sql, params) => [await query(sql, params)],
          execute: async (sql, params) => [await execute(sql, params)],
        });
      } catch (error) {
        ({ orders, checkouts, payments, events } = before);
        throw error;
      }
    });
    tail = result.catch(() => {});
    return result;
  }
  const gateway = {
    orders: {
      async create(input) {
        creates++;
        assert.equal(input.amount, 27000);
        assert.equal(input.partial_payment, false);
        const order = { ...input, id: `order_${creates}`, status: "created", amount_paid: 0 };
        remoteOrders.set(order.id, order);
        return structuredClone(order);
      },
      async fetch(id) {
        return structuredClone(remoteOrders.get(id));
      },
      async fetchPayments(id) {
        return {
          items: structuredClone(
            [...remotePayments.values()].filter((payment) => payment.order_id === id),
          ),
        };
      },
    },
    payments: {
      async fetch(id) {
        if (!remotePayments.has(id)) throw new Error("Unknown gateway payment");
        return structuredClone(remotePayments.get(id));
      },
    },
  };
  const deps = { query, transaction, gateway, keyId: "rzp_test_FAKE", secret };
  return {
    ...deps,
    service: paymentService(deps),
    remoteOrders,
    remotePayments,
    state: () => ({ orders, checkouts, payments, events, creates }),
    failWrite: (value) => {
      failPaymentWrite = value;
    },
  };
}

assert.equal(validSignature("raw-body", sign("raw-body"), secret), true);
assert.equal(validSignature("changed", sign("raw-body"), secret), false);
assert.equal(validSignature("raw-body", "short", secret), false);
assert.equal(validSignature("raw-body", "z".repeat(64), secret), false);
const f = fixture();
const [first, repeated] = await Promise.all([
  f.service.checkout(1, "SR-ONE"),
  f.service.checkout(1, "SR-ONE"),
]);
assert.equal(first.razorpayOrderId, repeated.razorpayOrderId);
assert.equal(
  f.state().creates,
  1,
  "Concurrent/repeated checkout must reuse the saved gateway order",
);
assert.equal(first.amount, 27000, "Amount is read from the persisted, server-priced order");
assert.equal(JSON.stringify(first).includes(secret), false);
assert.equal(
  (await f.service.status(1, "SR-ONE")).confirmed,
  false,
  "Abandoning checkout must not mark an order paid",
);
await assert.rejects(f.service.checkout(2, "SR-ONE"), (error) => error.status === 404);
const credentials = {
  razorpay_order_id: first.razorpayOrderId,
  razorpay_payment_id: "pay_1",
  razorpay_signature: sign(`${first.razorpayOrderId}|pay_1`),
};
await assert.rejects(f.service.verify(2, credentials), (error) => error.status === 404);
await assert.rejects(
  f.service.verify(1, { ...credentials, razorpay_signature: "0".repeat(64) }),
  (error) => error.status === 400,
);
const payment = {
  id: "pay_1",
  order_id: first.razorpayOrderId,
  amount: 27000,
  currency: "INR",
  status: "authorized",
  captured: false,
  method: "upi",
};
f.remotePayments.set(payment.id, payment);
assert.equal(
  (await f.service.verify(1, credentials)).confirmed,
  false,
  "A valid signature with authorization alone is not a paid order",
);
assert.equal(f.state().orders[0].payment_status, "PENDING");
for (const invalid of [{ amount: 1 }, { currency: "USD" }, { order_id: "order_WRONG" }]) {
  f.remotePayments.set(payment.id, { ...payment, ...invalid });
  await assert.rejects(f.service.verify(1, credentials), (error) => error.status === 400);
}
f.remotePayments.set(payment.id, { ...payment, status: "captured", captured: true });
await assert.rejects(
  f.service.verify(1, credentials),
  (error) => error.status === 409,
  "A capture must agree with the fetched gateway order",
);
Object.assign(f.remoteOrders.get(first.razorpayOrderId), { status: "paid", amount_paid: 27000 });
const confirmations = await Promise.all([
  f.service.verify(1, credentials),
  f.service.verify(1, credentials),
]);
assert.ok(confirmations.every((result) => result.confirmed));
assert.equal(f.state().orders[0].payment_status, "SUCCESS");
assert.equal(
  f.state().payments.length,
  1,
  "Duplicate callbacks must not duplicate payment records",
);
const metadata = JSON.parse(f.state().orders[0].customer_note);
assert.equal(metadata.donationAmount, 50);
assert.equal(metadata.gatewayPaymentId, "pay_1");
assert.equal(
  (await f.service.status(1, "SR-ONE")).confirmed,
  true,
  "A restart/lost callback is reconciled through persisted references",
);
assert.equal(
  (await paymentService(f).status(1, "SR-ONE")).confirmed,
  true,
  "A fresh service instance reuses persisted payment references",
);
const raw = Buffer.from(
  JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: first.razorpayOrderId } } },
  }),
);
await assert.rejects(
  f.service.webhook(raw, sign(raw), webhookSecret, "event_1"),
  (error) => error.status === 400,
);
await f.service.webhook(raw, sign(raw, webhookSecret), webhookSecret, "event_1");
await f.service.webhook(raw, sign(raw, webhookSecret), webhookSecret, "event_1");
assert.equal(f.state().events.length, 1);
assert.equal(f.state().payments.length, 1);
const paidRaw = Buffer.from(
  JSON.stringify({
    event: "order.paid",
    payload: { order: { entity: { id: first.razorpayOrderId } } },
  }),
);
await assert.rejects(
  f.service.webhook(paidRaw, sign(paidRaw, webhookSecret), webhookSecret, "event_1"),
  (error) => error.status === 409,
);
await f.service.webhook(paidRaw, sign(paidRaw, webhookSecret), webhookSecret, "event_2");
f.remotePayments.set("pay_FAILED", { ...payment, id: "pay_FAILED", status: "failed" });
const failedRaw = Buffer.from(
  JSON.stringify({
    event: "payment.failed",
    payload: { payment: { entity: { id: "pay_FAILED", order_id: first.razorpayOrderId } } },
  }),
);
await f.service.webhook(failedRaw, sign(failedRaw, webhookSecret), webhookSecret, "event_3");
assert.equal(
  f.state().orders[0].payment_status,
  "SUCCESS",
  "A late failed event must not overwrite a successful order",
);
assert.equal(f.state().checkouts[0].gateway_payment_id, "pay_1");
f.remotePayments.set("pay_1", { ...payment, status: "refunded", amount_refunded: 27000 });
assert.equal((await f.service.status(1, "SR-ONE")).state, "refunded");
assert.equal(f.state().orders[0].payment_status, "REFUNDED");
await assert.rejects(f.service.checkout(1, "SR-ONE"), (error) => error.status === 409);

const rollback = fixture();
const pending = await rollback.service.checkout(1, "SR-ONE");
Object.assign(rollback.remoteOrders.get(pending.razorpayOrderId), {
  status: "paid",
  amount_paid: 27000,
});
rollback.remotePayments.set("pay_2", {
  ...payment,
  id: "pay_2",
  order_id: pending.razorpayOrderId,
  status: "captured",
  captured: true,
});
rollback.failWrite(true);
await assert.rejects(rollback.service.status(1, "SR-ONE"));
assert.equal(
  rollback.state().orders[0].payment_status,
  "PENDING",
  "Payment persistence failure must roll back confirmation",
);
rollback.failWrite(false);
assert.equal((await rollback.service.status(1, "SR-ONE")).confirmed, true);
console.log(
  "PASS: server amounts, signatures, customer ownership, capture verification, amount/currency/order tampering, authorization/pending, duplicate callbacks/webhooks, late failures, refunds, restart reconciliation, and rollback. No real payment attempted.",
);

// Exercise HTTP routing, authentication/origin checks, disabled-mode behavior and body limits.
const http = fixture();
globalThis.__paymentHttp = http;
const customerUrl =
  url(`export function guardOrigin(request) { if (request.headers.get('origin') !== 'https://example.test') throw Object.assign(new Error('Origin denied'), {status:403}); }
 export async function mysqlSessionUser(request) { return request.headers.get('cookie') === 'session=one' ? { id: 1 } : undefined; }
 export async function mysqlLimit() {}
 export async function readBody(request) { return request.json(); }
 export async function mysqlCreateOrder() { throw new Error('The real trusted checkout core is covered by test:mysql-accounts.'); }`);
const mysqlUrl = url(
  "export const queryRows = (...args) => globalThis.__paymentHttp.query(...args); export const executeSql = async () => ({}); export const mysqlTransaction = (...args) => globalThis.__paymentHttp.transaction(...args);",
);
let httpSource = transpile("src/server/payments.server.ts")
  .replace(
    '"../../api/_commerce.mjs"',
    JSON.stringify(new URL("../api/_commerce.mjs", import.meta.url).href),
  )
  .replace(
    'import Razorpay from "razorpay";',
    "const Razorpay = function () { return globalThis.__paymentHttp.gateway; };",
  )
  .replace('"zod"', JSON.stringify(import.meta.resolve("zod")))
  .replace('"./customer.server"', JSON.stringify(customerUrl))
  .replace('"./mysql.server"', JSON.stringify(mysqlUrl))
  .replace('"./payment-service.server"', JSON.stringify(serviceUrl))
  .replace(
    '"./payment-schema.server"',
    JSON.stringify(url(transpile("src/server/payment-schema.server.ts"))),
  );
const { handlePaymentsRequest, validatePaymentEnvironment } = await import(url(httpSource));
Object.assign(process.env, {
  RAZORPAY_ENABLED: "true",
  RAZORPAY_KEY_ID: "rzp_test_FAKE",
  RAZORPAY_KEY_SECRET: secret,
  RAZORPAY_WEBHOOK_SECRET: webhookSecret,
  MYSQL_HOST: "test",
  MYSQL_USER: "test",
  MYSQL_DATABASE: "test",
  APP_ORIGIN: "https://example.test",
});
validatePaymentEnvironment();
delete process.env.RAZORPAY_WEBHOOK_SECRET;
assert.throws(validatePaymentEnvironment, /RAZORPAY_WEBHOOK_SECRET/);
process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
async function request(action, body, cookie = "session=one", origin = "https://example.test") {
  return handlePaymentsRequest(
    new Request(`https://example.test/api/payments/${action}`, {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
assert.equal((await request("create-order", { orderId: "SR-ONE" }, "")).status, 401);
assert.equal(
  (await request("create-order", { orderId: "SR-ONE" }, "session=one", "https://attacker.test"))
    .status,
  403,
);
assert.equal((await request("create-order", { orderId: "SR-ONE", amount: 1 })).status, 200);
assert.equal(http.state().checkouts[0].amount_paise, 27000);
assert.equal((await request("verify", { razorpay_signature: "fake" })).status, 400);
assert.equal(
  (
    await handlePaymentsRequest(
      new Request("https://example.test/api/payments/webhook", {
        method: "POST",
        body: "x".repeat(262145),
      }),
    )
  ).status,
  413,
);
process.env.RAZORPAY_ENABLED = "false";
assert.equal((await request("create-order", { orderId: "SR-ONE" })).status, 503);
assert.deepEqual(
  await (
    await handlePaymentsRequest(new Request("https://example.test/api/payments/config"))
  ).json(),
  { enabled: false },
);
delete globalThis.__paymentHttp;
console.log(
  "PASS: payment HTTP routing, origin/authentication guards, amount override rejection, webhook body limits, and disabled configuration.",
);
