import { createHmac, timingSafeEqual, createHash } from "node:crypto";

export class PaymentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function validSignature(body: string | Buffer, signature: unknown, secret: string): boolean {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

type PaymentDbRow = import("mysql2/promise").RowDataPacket & {
  id: number;
  order_id: number;
  customer_id: number;
  order_number: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  grand_total: number | string;
  customer_note: string;
  customer_name: string;
  customer_email: string;
  customer_mobile: string;
  gateway_order_id: string;
  gateway_payment_id: string;
  key_id: string;
  amount_paise: number;
  status: string;
  payload_sha256: string;
};
type Dependencies = {
  query: (sql: string, params?: unknown[]) => Promise<import("mysql2/promise").RowDataPacket[]>;
  transaction: <T>(
    work: (connection: import("mysql2/promise").PoolConnection) => Promise<T>,
  ) => Promise<T>;
  gateway: Pick<import("razorpay"), "orders" | "payments">;
  onConfirmed?: (
    connection: import("mysql2/promise").PoolConnection,
    order: PaymentDbRow,
  ) => Promise<void>;
  keyId: string;
  secret: string;
};
export function paymentService({
  query,
  transaction,
  gateway,
  keyId,
  secret,
  onConfirmed,
}: Dependencies) {
  async function ownedOrder(customerId: string | number, orderNumber: string) {
    const rows = (await query(
      "SELECT * FROM orders WHERE order_number = ? AND customer_id = ? AND deleted_at IS NULL",
      [orderNumber, customerId],
    )) as PaymentDbRow[];
    if (!rows[0]) throw new PaymentError(404, "Order not found.");
    return rows[0];
  }

  async function checkout(customerId: string | number, orderNumber: string) {
    const order = await ownedOrder(customerId, orderNumber);
    return transaction(async (connection) => {
      const [orders] = await connection.query<PaymentDbRow[]>(
        "SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
        [order.id],
      );
      const current = orders[0];
      if (!current || ["CANCELLED", "RETURNED", "REFUNDED"].includes(current.order_status))
        throw new PaymentError(409, "This order cannot be paid.");
      if (current.payment_method !== "RAZORPAY")
        throw new PaymentError(400, "This is not an online payment order.");
      const amount = Math.round(Number(current.grand_total) * 100);
      if (!Number.isSafeInteger(amount) || amount < 100)
        throw new PaymentError(400, "Invalid payable amount.");
      const [saved] = await connection.query<PaymentDbRow[]>(
        "SELECT * FROM razorpay_checkouts WHERE order_id = ? FOR UPDATE",
        [order.id],
      );
      let entry = saved[0];
      if (!entry) {
        await connection.execute(
          "INSERT INTO razorpay_checkouts (order_id, key_id, amount_paise) VALUES (?, ?, ?)",
          [order.id, keyId, amount],
        );
        entry = {
          order_id: order.id,
          key_id: keyId,
          amount_paise: amount,
          status: "created",
        } as PaymentDbRow;
      }
      if (entry.key_id !== keyId || Number(entry.amount_paise) !== amount)
        throw new PaymentError(409, "This payment requires assistance. Please contact support.");
      if (entry.status === "refunded") throw new PaymentError(409, "This order has been refunded.");
      if (!entry.gateway_order_id) {
        const remote = await gateway.orders.create({
          amount,
          currency: "INR",
          receipt: current.order_number,
          partial_payment: false,
        });
        if (!remote.id || Number(remote.amount) !== amount || remote.currency !== "INR")
          throw new PaymentError(502, "Payment provider returned an invalid order.");
        await connection.execute(
          "UPDATE razorpay_checkouts SET gateway_order_id = ? WHERE order_id = ?",
          [remote.id, order.id],
        );
        let metadata: Record<string, unknown> = {};
        try {
          metadata = JSON.parse(current.customer_note || "{}");
        } catch {
          /* Legacy plain notes. */
        }
        metadata["gatewayOrderId"] = remote.id;
        await connection.execute("UPDATE orders SET customer_note = ? WHERE id = ?", [
          JSON.stringify(metadata),
          order.id,
        ]);
        entry.gateway_order_id = remote.id;
      }
      return {
        keyId,
        razorpayOrderId: entry.gateway_order_id,
        orderId: current.order_number,
        amount,
        currency: "INR" as const,
        confirmed: entry.status === "captured" && current.payment_status === "SUCCESS",
        prefill: {
          name: current.customer_name,
          email: current.customer_email,
          contact: current.customer_mobile,
        },
      };
    });
  }

  async function findCheckout(gatewayOrderId: string, customerId?: string | number) {
    const rows = (await query(
      `SELECT c.*, o.order_number, o.customer_id FROM razorpay_checkouts c
      JOIN orders o ON o.id = c.order_id WHERE c.gateway_order_id = ? AND o.deleted_at IS NULL
      ${customerId === undefined ? "" : "AND o.customer_id = ?"}`,
      customerId === undefined ? [gatewayOrderId] : [gatewayOrderId, customerId],
    )) as PaymentDbRow[];
    if (!rows[0]) throw new PaymentError(404, "Payment order not found.");
    return rows[0];
  }

  async function reconcile(
    entry: PaymentDbRow,
    paymentId?: string,
    event?: { id: string; digest: string },
  ) {
    let payment;
    if (paymentId) payment = await gateway.payments.fetch(paymentId);
    else {
      const attempts = await gateway.orders.fetchPayments(entry.gateway_order_id);
      payment =
        attempts.items?.find((item) => item.status === "captured" || item.status === "refunded") ||
        attempts.items?.find((item) => item.status === "authorized") ||
        attempts.items?.[0];
    }
    if (!payment)
      return {
        confirmed: false,
        orderId: entry.order_number,
        state: "created",
        paymentId: "",
        amount: Number(entry.amount_paise) / 100,
      };
    const remoteOrder = await gateway.orders.fetch(entry.gateway_order_id);
    if (
      !/^pay_[A-Za-z0-9]+$/.test(payment.id) ||
      (paymentId && payment.id !== paymentId) ||
      payment.order_id !== entry.gateway_order_id ||
      remoteOrder.id !== entry.gateway_order_id ||
      Number(payment.amount) !== Number(entry.amount_paise) ||
      Number(remoteOrder.amount) !== Number(entry.amount_paise) ||
      payment.currency !== "INR" ||
      remoteOrder.currency !== "INR"
    ) {
      throw new PaymentError(400, "Payment amount, currency or order could not be verified.");
    }
    const fullyRefunded =
      payment.status === "refunded" &&
      Number(payment.amount_refunded) === Number(entry.amount_paise);
    const captured =
      payment.status === "captured" &&
      payment.captured === true &&
      remoteOrder.status === "paid" &&
      Number(remoteOrder.amount_paid) === Number(entry.amount_paise);
    const state = fullyRefunded
      ? "refunded"
      : captured
        ? "captured"
        : payment.status === "failed"
          ? "failed"
          : "authorized";
    if (!["authorized", "captured", "failed", "refunded"].includes(payment.status))
      throw new PaymentError(409, "Payment confirmation is still pending.");
    if (payment.status === "captured" && !captured)
      throw new PaymentError(409, "Payment capture has not been confirmed.");
    return transaction(async (connection) => {
      const [orders] = await connection.query<PaymentDbRow[]>(
        "SELECT * FROM orders WHERE id = ? FOR UPDATE",
        [entry.order_id],
      );
      const [checkouts] = await connection.query<PaymentDbRow[]>(
        "SELECT * FROM razorpay_checkouts WHERE order_id = ? FOR UPDATE",
        [entry.order_id],
      );
      const current = checkouts[0],
        order = orders[0];
      if (!current || !order || current.gateway_order_id !== payment.order_id)
        throw new PaymentError(409, "Payment reference changed.");
      if (event) {
        const [seen] = await connection.query<PaymentDbRow[]>(
          "SELECT payload_sha256 FROM razorpay_webhook_events WHERE event_id = ?",
          [event.id],
        );
        if (seen[0] && seen[0].payload_sha256 !== event.digest)
          throw new PaymentError(409, "Webhook event conflicts with an earlier delivery.");
        if (!seen[0])
          await connection.execute(
            "INSERT INTO razorpay_webhook_events (event_id, payload_sha256) VALUES (?, ?)",
            [event.id, event.digest],
          );
      }
      // A late failed/authorized event cannot downgrade a capture or full refund.
      const retain =
        current.status === "refunded" || (current.status === "captured" && !fullyRefunded);
      const next = retain ? current.status : state;
      const confirmed = next === "captured";
      const dbStatus = confirmed
        ? "SUCCESS"
        : next === "refunded"
          ? "REFUNDED"
          : next === "failed"
            ? "FAILED"
            : "PENDING";
      if (!retain) {
        await connection.execute(
          `UPDATE razorpay_checkouts SET status = ?, gateway_payment_id = ?, method = ?, verified_at = NOW() WHERE order_id = ?`,
          [next, payment.id, payment.method || null, entry.order_id],
        );
        let metadata: Record<string, unknown> = {};
        try {
          metadata = JSON.parse(order.customer_note || "{}");
        } catch {
          /* Preserve legacy orders without JSON notes. */
        }
        metadata["gatewayOrderId"] = entry.gateway_order_id;
        metadata["gatewayPaymentId"] = payment.id;
        metadata["paymentState"] = next;
        metadata["paymentMethod"] = payment.method || "";
        if (captured) metadata["paidAt"] = new Date().toISOString();
        await connection.execute(
          "UPDATE orders SET payment_status = ?, customer_note = ? WHERE id = ?",
          [dbStatus, JSON.stringify(metadata), entry.order_id],
        );
      }
      // One durable payment row per gateway attempt; serialize through the order lock.
      const [attempts] = await connection.query<PaymentDbRow[]>(
        "SELECT id, status FROM payments WHERE CAST(gateway_payment_id AS BINARY) = CAST(? AS BINARY) AND order_id = ?",
        [payment.id, entry.order_id],
      );
      const attemptStatus =
        state === "captured"
          ? "SUCCESS"
          : state === "refunded"
            ? "REFUNDED"
            : state === "failed"
              ? "FAILED"
              : "PENDING";
      if (!attempts[0]) {
        await connection.execute(
          `INSERT INTO payments (order_id, gateway, transaction_id, gateway_payment_id, gateway_order_id, amount, currency, status, gateway_response, paid_at)
          VALUES (?, 'RAZORPAY', ?, ?, ?, ?, 'INR', ?, ?, ${captured ? "NOW()" : "NULL"})`,
          [
            entry.order_id,
            payment.id,
            payment.id,
            entry.gateway_order_id,
            Number(entry.amount_paise) / 100,
            attemptStatus,
            JSON.stringify({ method: payment.method || "", status: payment.status }),
          ],
        );
      } else if (
        attempts[0].status !== "REFUNDED" &&
        (attempts[0].status !== "SUCCESS" || fullyRefunded)
      ) {
        await connection.execute(
          `UPDATE payments SET status = ?, paid_at = ${captured ? "COALESCE(paid_at, NOW())" : "paid_at"} WHERE id = ?`,
          [attemptStatus, attempts[0].id],
        );
      }
      if (confirmed && onConfirmed)
        await onConfirmed(connection, { ...order, payment_status: "SUCCESS" });
      return {
        confirmed,
        orderId: entry.order_number,
        state: next,
        paymentId: retain ? current.gateway_payment_id : payment.id,
        amount: Number(entry.amount_paise) / 100,
      };
    });
  }

  async function verify(
    customerId: string | number,
    input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    const entry = await findCheckout(input.razorpay_order_id, customerId);
    if (
      !validSignature(
        `${entry.gateway_order_id}|${input.razorpay_payment_id}`,
        input.razorpay_signature,
        secret,
      )
    )
      throw new PaymentError(400, "Invalid payment signature.");
    return reconcile(entry, input.razorpay_payment_id);
  }

  async function status(customerId: string | number, orderNumber: string) {
    const order = await ownedOrder(customerId, orderNumber);
    const entries = (await query("SELECT * FROM razorpay_checkouts WHERE order_id = ?", [
      order.id,
    ])) as PaymentDbRow[];
    if (!entries[0]?.gateway_order_id) throw new PaymentError(404, "Payment order not found.");
    return reconcile({ ...entries[0], order_number: order.order_number });
  }

  async function webhook(
    raw: Buffer,
    signature: string | null,
    webhookSecret: string,
    eventId: string | null,
  ) {
    if (!webhookSecret || !validSignature(raw, signature, webhookSecret))
      throw new PaymentError(400, "Invalid webhook signature.");
    const data = JSON.parse(raw.toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new PaymentError(400, "Invalid webhook payload.");
    if (!["payment.captured", "payment.failed", "order.paid"].includes(data.event))
      return { ok: true };
    const payment = data.payload?.payment?.entity;
    const remoteOrderId = payment?.order_id || data.payload?.order?.entity?.id;
    if (typeof remoteOrderId !== "string") return { ok: true };
    let entry;
    try {
      entry = await findCheckout(remoteOrderId);
    } catch (error) {
      if (error instanceof PaymentError && error.status === 404) return { ok: true };
      throw error;
    }
    const digest = createHash("sha256").update(raw).digest("hex");
    const event = { id: eventId?.slice(0, 200) || digest, digest };
    await reconcile(entry, payment?.id, event);
    return { ok: true };
  }
  return { checkout, verify, status, webhook };
}
