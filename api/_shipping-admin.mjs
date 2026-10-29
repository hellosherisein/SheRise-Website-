import {
  createShipment,
  shipmentLabel,
  syncTracking,
  reconcileShipment,
} from "./_ekart-shipments.mjs";
import { ekartConfigured } from "./_ekart-client.mjs";
import { commerceError } from "./_commerce.mjs";

export async function shipmentPayload(query, orderNumber) {
  const rows = await query(
    `SELECT s.*, o.order_number, o.payment_method, o.payment_status, o.shipping_amount, o.grand_total, o.customer_note
 FROM orders o LEFT JOIN ekart_shipments s ON s.order_id = o.id WHERE o.order_number = ? AND o.deleted_at IS NULL`,
    [orderNumber],
  );
  if (!rows[0]) throw commerceError(404, "Order not found.");
  const events = rows[0].order_id
    ? await query(
        "SELECT status, occurred_at FROM ekart_shipment_events WHERE order_id = ? ORDER BY occurred_at, id",
        [rows[0].order_id],
      )
    : [];
  let metadata = {};
  try {
    metadata = JSON.parse(rows[0].customer_note || "{}");
  } catch {
    /* Legacy note. */
  }
  const { customer_note, ...shipment } = rows[0];
  return {
    shipment: {
      ...shipment,
      carrier_cost: metadata.shippingQuote?.carrierCost ?? null,
      cod_fee: metadata.shippingQuote?.codFee ?? null,
      shipping_tax: metadata.shippingQuote?.shippingTax ?? null,
    },
    events,
    adapterReady: true,
    credentialsConfigured: ekartConfigured(),
    liveEnabled: process.env.EKART_SHIPPING_ENABLED === "true",
  };
}
export async function shippingAdminAction(transaction, input) {
  if (input.action === "create" || input.action === "retry")
    return createShipment(transaction, String(input.orderId || ""));
  if (input.action === "sync-tracking")
    return syncTracking(transaction, String(input.orderId || ""));
  if (input.action === "reconcile")
    return reconcileShipment(transaction, String(input.orderId || ""), input.trackingId);
  if (input.action !== "verify-cod") throw commerceError(503, "Unsupported shipping action.");
  if (
    typeof input.orderId !== "string" ||
    typeof input.evidence !== "string" ||
    input.evidence.trim().length < 12 ||
    input.evidence.length > 500 ||
    input.confirmed !== true
  )
    throw commerceError(
      400,
      "Confirm collection using a verifiable settlement/evidence reference (12–500 characters).",
    );
  await transaction(async (c) => {
    const [orders] = await c.query(
      "SELECT id, payment_method, grand_total FROM orders WHERE order_number = ? AND deleted_at IS NULL FOR UPDATE",
      [input.orderId],
    );
    const order = orders[0];
    if (!order || order.payment_method !== "COD")
      throw commerceError(400, "A COD order is required.");
    const [shipments] = await c.query(
      "SELECT * FROM ekart_shipments WHERE order_id = ? FOR UPDATE",
      [order.id],
    );
    if (!shipments[0]) throw commerceError(409, "No shipment settlement record exists.");
    if (shipments[0].cod_settlement_status === "VERIFIED") return;
    if (
      Number(input.amount) !== Number(shipments[0].cod_amount) ||
      Number(input.amount) !== Number(order.grand_total)
    )
      throw commerceError(400, "Evidence amount must match the COD collectible amount.");
    await c.execute(
      "UPDATE ekart_shipments SET cod_settlement_status = 'VERIFIED', cod_evidence = ? WHERE order_id = ?",
      [input.evidence.trim(), order.id],
    );
    await c.execute(
      "INSERT INTO payments (order_id, gateway, amount, currency, status, paid_at, gateway_response) VALUES (?, 'COD', ?, 'INR', 'SUCCESS', NOW(), ?)",
      [
        order.id,
        order.grand_total,
        JSON.stringify({ source: "verified-admin-evidence", reference: input.evidence.trim() }),
      ],
    );
    await c.execute("UPDATE orders SET payment_status = 'SUCCESS' WHERE id = ?", [order.id]);
  });
}
