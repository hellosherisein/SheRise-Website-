import { createHash } from "node:crypto";
import { commerceError, readCommerceConfig, jsonValue, transitionStock } from "./_commerce.mjs";
import { ekartClient } from "./_ekart-client.mjs";
import { createCarrier } from "./_shipping.mjs";

function metadata(order) {
  try {
    return jsonValue(order.customer_note || "{}");
  } catch {
    throw commerceError(409, "Order shipping details need admin review.");
  }
}
function number(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw commerceError(409, "Order amounts need admin review.");
  return n;
}
function date(value) {
  const result = new Date(value);
  if (!Number.isFinite(result.getTime()))
    throw commerceError(409, "Invoice date needs admin review.");
  return result.toISOString().slice(0, 10);
}

export function buildShipmentPayload(order, items, config) {
  const note = metadata(order),
    quote = note.shippingQuote;
  if (note.commerceVersion !== 1 || !quote?.parcel)
    throw commerceError(
      409,
      "This order has no verified parcel quote; configure shipping before fulfillment.",
    );
  if (
    !config.pricingConfirmed ||
    !config.pricingPlan ||
    !config.courierGroup ||
    quote.courierGroup !== config.courierGroup ||
    quote.pricingPlan !== config.pricingPlan ||
    quote.serviceType !== config.serviceType
  )
    throw commerceError(
      409,
      "Order quote and confirmed carrier configuration must match before shipment.",
    );
  if (
    !config.pickupName ||
    !config.pickupAddress ||
    !config.pickupCity ||
    !config.pickupState ||
    !/^\d{10}$/.test(config.pickupPhone) ||
    !config.sellerName ||
    !config.sellerAddress ||
    !config.categoryOfGoods ||
    config.sellerTaxStatus === "UNCONFIGURED"
  )
    throw commerceError(
      409,
      "Complete pickup, seller, tax-registration and goods configuration before shipment.",
    );
  if (config.sellerTaxStatus === "REGISTERED" && !/^[A-Z0-9]{15}$/.test(config.sellerGstTin))
    throw commerceError(409, "A registered seller needs its verified GSTIN.");
  if (
    !items.length ||
    !/^\d{10}$/.test(order.shipping_mobile) ||
    !order.shipping_name ||
    !order.shipping_address_line1 ||
    !order.shipping_city ||
    !order.shipping_state ||
    !/^[1-9][0-9]{5}$/.test(order.shipping_pincode)
  )
    throw commerceError(409, "Order delivery details need correction before shipment.");
  const parcel = quote.parcel;
  if (
    ![parcel.weightG, parcel.lengthCm, parcel.widthCm, parcel.heightCm].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    throw commerceError(409, "Order parcel measurements are invalid.");
  const taxable =
    Math.round((number(order.subtotal_amount) - number(order.discount_amount)) * 100) / 100;
  if (taxable < 1)
    throw commerceError(409, "Ekart requires a goods taxable amount of at least ₹1.");
  const tax = number(order.tax_amount),
    cod = order.payment_method === "COD",
    collectible = cod ? number(order.grand_total) : 0;
  if (cod && (taxable <= config.codMinimum || collectible > Math.min(20000, config.codMaximum)))
    throw commerceError(409, "COD amount is outside the approved limits.");
  const pickup = {
    name: config.pickupName,
    address: config.pickupAddress,
    city: config.pickupCity,
    state: config.pickupState,
    country: "India",
    phone: Number(config.pickupPhone),
    pin: Number(config.pickupPin),
    location_type: "Office",
  };
  return {
    seller_name: config.sellerName,
    seller_address: config.sellerAddress,
    seller_gst_tin: config.sellerTaxStatus === "REGISTERED" ? config.sellerGstTin : "",
    consignee_gst_amount: tax,
    tax_value: tax,
    order_number: order.order_number,
    invoice_number: order.order_number,
    invoice_date: date(order.created_at),
    consignee_name: order.shipping_name,
    consignee_alternate_phone: order.shipping_mobile,
    payment_mode: cod ? "COD" : "Prepaid",
    category_of_goods: config.categoryOfGoods,
    products_desc: items
      .map((i) => `${i.product_name} x${i.quantity}`)
      .join(", ")
      .slice(0, 1000),
    total_amount: Math.round((taxable + tax) * 100) / 100,
    cod_amount: collectible,
    taxable_amount: taxable,
    commodity_value: taxable.toFixed(2),
    return_reason: "",
    quantity: items.reduce((n, i) => n + Number(i.quantity), 0),
    weight: Math.ceil(parcel.weightG),
    length: Math.ceil(parcel.lengthCm),
    width: Math.ceil(parcel.widthCm),
    height: Math.ceil(parcel.heightCm),
    service: config.serviceType,
    drop_location: {
      name: order.shipping_name,
      address: [order.shipping_address_line1, order.shipping_address_line2]
        .filter(Boolean)
        .join(", "),
      city: order.shipping_city,
      state: order.shipping_state,
      country: "India",
      phone: Number(order.shipping_mobile),
      pin: Number(order.shipping_pincode),
      location_type: "Home",
    },
    pickup_location: pickup,
    return_location: { ...pickup },
    items: items.map((i) => ({
      product_name: i.product_name,
      sku: i.sku || "",
      quantity: Number(i.quantity),
    })),
  };
}

const orderQuery = "SELECT * FROM orders WHERE order_number = ? AND deleted_at IS NULL FOR UPDATE";
export async function createShipment(
  transaction,
  orderNumber,
  { client = ekartClient, env = process.env } = {},
) {
  if (env.EKART_SHIPPING_ENABLED !== "true")
    throw commerceError(503, "Live Ekart shipment creation is disabled pending explicit approval.");
  const prepared = await transaction(async (c) => {
    const [orders] = await c.query(orderQuery, [orderNumber]);
    const order = orders[0];
    if (!order) throw commerceError(404, "Order not found.");
    if (
      ["CANCELLED", "RETURNED", "REFUNDED"].includes(order.order_status) ||
      (order.payment_method !== "COD" && order.payment_status !== "SUCCESS")
    )
      throw commerceError(409, "Only an active COD or verified paid order can be shipped.");
    const [shipments] = await c.query(
      "SELECT * FROM ekart_shipments WHERE order_id = ? FOR UPDATE",
      [order.id],
    );
    const shipment = shipments[0];
    if (!shipment) throw commerceError(409, "This order has no shipment queue record.");
    if (shipment.status === "CREATED") return { existing: true, shipment };
    if (["PROCESSING", "UNKNOWN"].includes(shipment.status))
      throw commerceError(
        409,
        "A previous creation attempt needs carrier reconciliation. Automatic retry is blocked to prevent duplicates.",
      );
    if (!["QUEUED", "BLOCKED", "FAILED"].includes(shipment.status))
      throw commerceError(409, "This shipment cannot be created.");
    const config = await readCommerceConfig(async (sql, params) => {
      const [rows] = await c.query(sql, params);
      return rows;
    });
    const [items] = await c.query("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", [
      order.id,
    ]);
    let payload;
    try {
      payload = buildShipmentPayload(order, items, config);
    } catch (error) {
      await c.execute(
        "UPDATE ekart_shipments SET status = 'FAILED', last_error = ? WHERE order_id = ?",
        [error.message, order.id],
      );
      return { error: error.message };
    }
    await c.execute(
      "UPDATE ekart_shipments SET status = 'PROCESSING', attempts = attempts + 1, last_error = NULL WHERE order_id = ?",
      [order.id],
    );
    return { order, payload, config, quote: metadata(order).shippingQuote };
  });
  if (prepared.error) throw commerceError(409, prepared.error);
  if (prepared.existing) return { created: true, shipment: prepared.shipment };
  const { order, payload, config, quote } = prepared;
  let dispatched = false;
  try {
    const fresh = await createCarrier(client).quote({
      pickupPin: config.pickupPin,
      deliveryPin: order.shipping_pincode,
      parcel: quote.parcel,
      payment: payload.payment_mode === "COD" ? "COD" : "PREPAID",
      shipmentValue: payload.taxable_amount,
      productTax: payload.tax_value,
      collectibleAmount: payload.cod_amount,
      pricingPlan: config.pricingPlan,
      pricingConfirmed: config.pricingConfirmed,
      courierGroup: config.courierGroup,
      serviceType: config.serviceType,
    });
    if (
      Math.abs(
        fresh.carrierCost +
          fresh.codFee +
          fresh.shippingTax -
          number(quote.carrierCost) -
          number(quote.codFee) -
          number(quote.shippingTax),
      ) > 0.011
    )
      throw commerceError(
        409,
        "Carrier charges changed after checkout. Admin review is required; customer totals were preserved.",
      );
    // Recheck the durable order and hold its lock across the single external creation call.
    // This prevents concurrent cancellation/restocking while the carrier accepts the shipment.
    return await transaction(async (c) => {
      const [currentOrders] = await c.query(orderQuery, [order.order_number]);
      const current = currentOrders[0];
      const [rows] = await c.query("SELECT * FROM ekart_shipments WHERE order_id = ? FOR UPDATE", [
        order.id,
      ]);
      if (
        !current ||
        ["CANCELLED", "RETURNED", "REFUNDED"].includes(current.order_status) ||
        rows[0]?.status !== "PROCESSING" ||
        (current.payment_method !== "COD" && current.payment_status !== "SUCCESS")
      )
        throw commerceError(409, "Order changed before shipment creation.");
      dispatched = true;
      const result = await client.create(payload);
      const trackingUrl = `https://app.elite.ekartlogistics.in/track/${encodeURIComponent(result.tracking_id)}`;
      await c.execute(
        "UPDATE ekart_shipments SET status = 'CREATED', shipment_id = ?, awb = ?, tracking_url = ?, label_reference = ?, last_error = NULL WHERE order_id = ?",
        [result.tracking_id, result.barcodes.wbn, trackingUrl, result.tracking_id, order.id],
      );
      await transitionStock(c, order.id, "commit");
      await c.execute(
        "UPDATE orders SET courier_partner = ?, tracking_id = ?, tracking_url = ? WHERE id = ?",
        [result.vendor || "Ekart", result.tracking_id, trackingUrl, order.id],
      );
      return { created: true, trackingId: result.tracking_id, awb: result.barcodes.wbn };
    });
  } catch (error) {
    const ambiguous =
      dispatched && !error.definiteRejection && (!error.carrierStatus || error.uncertain);
    const message = ambiguous
      ? "Shipment outcome is unknown. Reconcile with Ekart before any retry."
      : error.status
        ? error.message
        : "Shipment could not be created. Review account configuration.";
    try {
      await transaction(async (c) => {
        await c.query(orderQuery, [order.order_number]);
        await c.execute(
          "UPDATE ekart_shipments SET status = ?, last_error = ? WHERE order_id = ? AND status = 'PROCESSING'",
          [ambiguous ? "UNKNOWN" : "FAILED", message, order.id],
        );
      });
    } catch {
      /* PROCESSING remains durable and blocks duplicate creation if persistence is unavailable. */
    }
    throw commerceError(ambiguous ? 503 : error.status || 503, message);
  }
}

export async function shipmentLabel(query, orderNumber, client = ekartClient) {
  const rows = await query(
    "SELECT s.shipment_id FROM ekart_shipments s JOIN orders o ON o.id = s.order_id WHERE o.order_number = ? AND o.deleted_at IS NULL AND s.status = 'CREATED'",
    [orderNumber],
  );
  if (!rows[0]?.shipment_id)
    throw commerceError(409, "A created Ekart shipment is required before downloading a label.");
  return client.label(rows[0].shipment_id);
}

export async function reconcileShipment(
  transaction,
  orderNumber,
  trackingId,
  client = ekartClient,
) {
  if (typeof trackingId !== "string" || !/^[A-Za-z0-9-]{1,150}$/.test(trackingId))
    throw commerceError(400, "Enter the Ekart tracking ID confirmed in the seller dashboard.");
  const response = await client.track(trackingId);
  const container = response?.[trackingId];
  const records = Array.isArray(container?.shipments) ? container.shipments : [container];
  if (records.filter((r) => r && String(r.order_id) === String(orderNumber)).length !== 1)
    throw commerceError(409, "Ekart could not verify that tracking ID belongs to this order.");
  return transaction(async (c) => {
    const [orders] = await c.query(orderQuery, [orderNumber]);
    const order = orders[0];
    if (
      !order ||
      ["CANCELLED", "RETURNED", "REFUNDED"].includes(order.order_status) ||
      (order.payment_method !== "COD" && order.payment_status !== "SUCCESS")
    )
      throw commerceError(409, "The order is not eligible for shipment reconciliation.");
    const [rows] = await c.query("SELECT * FROM ekart_shipments WHERE order_id = ? FOR UPDATE", [
      order.id,
    ]);
    if (!rows[0] || !["UNKNOWN", "PROCESSING"].includes(rows[0].status))
      throw commerceError(409, "Only an uncertain creation attempt can be reconciled.");
    const trackingUrl = `https://app.elite.ekartlogistics.in/track/${encodeURIComponent(trackingId)}`;
    await c.execute(
      "UPDATE ekart_shipments SET status = 'CREATED', shipment_id = ?, tracking_url = ?, label_reference = ?, last_error = NULL WHERE order_id = ?",
      [trackingId, trackingUrl, trackingId, order.id],
    );
    await transitionStock(c, order.id, "commit");
    await c.execute(
      "UPDATE orders SET courier_partner = 'Ekart', tracking_id = ?, tracking_url = ? WHERE id = ?",
      [trackingId, trackingUrl, order.id],
    );
    return { reconciled: true };
  });
}

const customerStatuses = {
  "Order Placed": "Shipment created",
  "Picked Up": "Picked up",
  "In Transit": "In transit",
  "Out for Delivery": "Out for delivery",
  Delivered: "Delivered",
  "RTO Requested": "Return initiated",
  "Seller RTO Requested": "Return initiated",
  "RTO In Transit": "Return in transit",
  "RTO Out for Delivery": "Return in transit",
  "RTO Delivered": "Returned",
  Lost: "Delivery exception",
  Damaged: "Delivery exception",
  Undelivered: "Delivery exception",
  "Shipment Delayed": "Delivery exception",
  "Not Serviceable": "Delivery exception",
  "RTO Failed": "Return exception",
  "RTO Shipment Delayed": "Return exception",
  Cancelled: "Cancelled",
  "Seller Cancelled": "Cancelled",
  "Pickup Cancelled": "Pickup cancelled",
  "Pickup Pending": "Pickup pending",
  "Pickup Scheduled": "Pickup scheduled",
  "Out for Pickup": "Out for pickup",
  "Not Picked": "Pickup exception",
};
const orderStatuses = {
  "Picked Up": "SHIPPED",
  "In Transit": "SHIPPED",
  "Out for Delivery": "OUT_FOR_DELIVERY",
  Delivered: "DELIVERED",
  "RTO Delivered": "RETURNED",
};
export function trackingEvents(response, trackingId, orderNumber) {
  // YAML models a response keyed by WBN; accept only that exact key and matching order identity.
  const container = response?.[trackingId];
  const matches = Array.isArray(container?.shipments)
    ? container.shipments.filter((s) => String(s.order_id) === String(orderNumber))
    : null;
  const record = matches ? (matches.length === 1 ? matches[0] : null) : container;
  if (!record || !Array.isArray(record.history) || String(record.order_id) !== String(orderNumber))
    throw commerceError(502, "Ekart tracking identity could not be verified.");
  return record.history
    .map((event) => {
      const time = Date.parse(event.event_date_iso8601 || event.updated_datetime || "");
      if (!Number.isFinite(time) || time > Date.now() + 300000 || typeof event.status !== "string")
        throw commerceError(502, "Ekart tracking event needs a valid timestamp and status.");
      const canonical = Object.keys(customerStatuses).find(
        (status) => status.toLowerCase() === event.status.trim().toLowerCase(),
      );
      const id = createHash("sha256")
        .update(
          JSON.stringify([
            trackingId,
            event.status,
            time,
            event.hub_name || "",
            event.public_description || "",
          ]),
        )
        .digest("hex");
      return {
        id,
        rawStatus: event.status,
        status: customerStatuses[canonical] || `Carrier: ${event.status}`,
        time: new Date(time),
        orderStatus: orderStatuses[canonical],
      };
    })
    .sort((a, b) => a.time - b.time);
}
export async function syncTracking(transaction, orderNumber, client = ekartClient) {
  const identity = await transaction(async (c) => {
    const [rows] = await c.query(
      "SELECT s.order_id, s.shipment_id FROM ekart_shipments s JOIN orders o ON o.id = s.order_id WHERE o.order_number = ? AND o.deleted_at IS NULL AND s.status = 'CREATED'",
      [orderNumber],
    );
    if (!rows[0]?.shipment_id)
      throw commerceError(409, "No created shipment is available to track.");
    return rows[0];
  });
  let events;
  try {
    events = trackingEvents(
      await client.track(identity.shipment_id),
      identity.shipment_id,
      orderNumber,
    );
  } catch (error) {
    await transaction(async (c) => {
      await c.query(orderQuery, [orderNumber]);
      await c.execute("UPDATE ekart_shipments SET last_error = ? WHERE order_id = ?", [
        "Tracking synchronization failed. Review carrier access, response identity and timestamps before retry.",
        identity.order_id,
      ]);
    });
    throw commerceError(
      error.status || 502,
      "Ekart tracking could not be verified. The previous shipment status was preserved.",
    );
  }
  return transaction(async (c) => {
    const [orders] = await c.query(orderQuery, [orderNumber]);
    const order = orders[0];
    if (!order) throw commerceError(404, "Order not found.");
    const [shipments] = await c.query(
      "SELECT * FROM ekart_shipments WHERE order_id = ? FOR UPDATE",
      [order.id],
    );
    if (shipments[0]?.shipment_id !== identity.shipment_id)
      throw commerceError(409, "Shipment changed during tracking synchronization.");
    for (const event of events)
      await c.execute(
        "INSERT IGNORE INTO ekart_shipment_events (order_id, carrier_event_id, status, occurred_at) VALUES (?, ?, ?, ?)",
        [order.id, event.id, event.status, event.time],
      );
    const [latest] = await c.query(
      "SELECT status, occurred_at FROM ekart_shipment_events WHERE order_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 1",
      [order.id],
    );
    const event = events.at(-1);
    if (
      event &&
      (!latest[0] || event.time.getTime() >= new Date(latest[0].occurred_at).getTime())
    ) {
      await c.execute(
        "UPDATE ekart_shipments SET carrier_status = ?, last_error = NULL WHERE order_id = ?",
        [event.status, order.id],
      );
      // Do not regress delivered/returned orders on stale scans. COD payment is never changed here.
      const next = event.orderStatus;
      if (
        next &&
        next !== order.order_status &&
        !["CANCELLED", "REFUNDED", "RETURNED"].includes(order.order_status) &&
        !(order.order_status === "DELIVERED" && next !== "RETURNED")
      ) {
        await c.execute(
          `UPDATE orders SET order_status = ?, ${next === "DELIVERED" ? "delivered_at = COALESCE(delivered_at, ?)" : "dispatched_at = COALESCE(dispatched_at, ?)"} WHERE id = ?`,
          [next, event.time, order.id],
        );
        await c.execute(
          "INSERT INTO order_status_history (order_id, previous_status, new_status, note) VALUES (?, ?, ?, ?)",
          [order.id, order.order_status, next, "Verified Ekart tracking update."],
        );
      }
    }
    await c.execute("UPDATE ekart_shipments SET updated_at = NOW() WHERE order_id = ?", [order.id]);
    return { synced: true, events: events.length };
  });
}
