import assert from "node:assert/strict";
import fs from "node:fs";
import { createEkartClient } from "../api/_ekart-client.mjs";
import { createCarrier, calculateShipping } from "../api/_shipping.mjs";
import { commerceConfigSchema } from "../api/_commerce.mjs";
import {
  buildShipmentPayload,
  createShipment,
  trackingEvents,
  syncTracking,
  reconcileShipment,
  shipmentLabel,
} from "../api/_ekart-shipments.mjs";

// All transport and database dependencies below are fake. This script never loads .env.
const spec = fs.readFileSync("docs/ekart-openapi.yaml", "utf8");
for (const path of [
  "/integrations/v2/auth/token/{client_id}",
  "/api/v1/package/create",
  "/api/v1/package/label",
  "/data/v1/elite/track/{wbn}",
  "/api/v2/serviceability/{pincode}",
  "/data/v3/serviceability",
])
  assert.ok(spec.includes(path));
const env = {
  EKART_CLIENT_ID: "TEST/CLIENT",
  EKART_USERNAME: "fake-seller",
  EKART_PASSWORD: "fake-private-password",
  EKART_API_BASE_URL: "https://carrier.example",
  EKART_SHIPPING_ENABLED: "false",
};
let clock = 0,
  auth = 0,
  creates = 0,
  reads = 0,
  mode = "ok",
  requests = [];
const response = (data) =>
  new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
const v2 = {
  status: true,
  details: { forward_pickup: true, forward_drop: true, cod: true, max_cod_amount: 20000 },
};
const charge = (group = "CONFIRMED", cod = 0) => ({
  courierGroup: group,
  forwardDeliveredCharges: {
    forwardFreight: "60",
    forwardFuelSurcharge: "1",
    codCharges: String(cod),
    deliveredTotalTax: "10.98",
    totalForwardDeliveredEstimate: String(71.98 + cod),
  },
});
const fetchImpl = async (url, init) => {
  const path = new URL(url).pathname;
  requests.push({
    url,
    path,
    method: init.method,
    body: init.body ? JSON.parse(init.body) : undefined,
    authorization: init.headers.authorization,
  });
  if (path.startsWith("/integrations/v2/auth/token/")) {
    auth++;
    assert.deepEqual(JSON.parse(init.body), {
      username: env.EKART_USERNAME,
      password: env.EKART_PASSWORD,
    });
    return response({
      access_token: `fake-${auth}`,
      expires_in: 120,
      token_type: "Bearer",
      scope: "core:all",
    });
  }
  assert.match(init.headers.authorization, /^Bearer fake-/);
  if (mode === "401") {
    mode = "ok";
    return new Response("unauthorized", { status: 401 });
  }
  if (path.startsWith("/api/v2/serviceability/")) {
    reads++;
    if (mode === "transient" && reads < 3) throw new Error("fake network timeout");
    return response(v2);
  }
  if (path === "/data/v3/serviceability")
    return response([
      {
        courierGroup: "CHEAPER",
        forwardDeliveredCharges: {
          forwardFreight: "1",
          forwardFuelSurcharge: "0",
          codCharges: "0",
          deliveredTotalTax: "0",
          totalForwardDeliveredEstimate: "1",
        },
      },
      charge("CONFIRMED", JSON.parse(init.body).paymentType === "COD" ? 15 : 0),
    ]);
  if (path === "/api/v1/package/create") {
    creates++;
    if (mode === "create-timeout") throw new Error("fake timeout after send");
    return response({
      status: true,
      tracking_id: "EKART-1",
      barcodes: { wbn: "AWB-1", order: "SR-1001" },
      vendor: "EKART",
    });
  }
  if (path === "/api/v1/package/label") {
    assert.equal(new URL(url).searchParams.get("json_only"), "false");
    assert.deepEqual(JSON.parse(init.body), { ids: ["EKART-1"] });
    return new Response("%PDF-fake-label", {
      headers: { "content-type": "application/octet-stream" },
    });
  }
  throw new Error("Unexpected mock endpoint");
};
const client = createEkartClient({ env, fetchImpl, now: () => clock, pause: async () => {} });
await Promise.all([client.serviceability("400013"), client.serviceability("411001")]);
assert.equal(auth, 1, "Concurrent requests share one token request");
clock = 100000;
await client.serviceability("411001");
assert.equal(auth, 2, "Expired token reacquired");
mode = "401";
await client.serviceability("411001");
assert.equal(auth, 3, "Unauthorized response refreshes token once");
reads = 0;
mode = "transient";
await client.serviceability("411001");
assert.equal(reads, 3, "Only safe read requests retry transient failures");
mode = "ok";
const before = requests.length;
await assert.rejects(client.create({}), /disabled/);
assert.equal(requests.length, before, "Disabled shipping does not even authenticate");
env.EKART_SHIPPING_ENABLED = "true";
mode = "create-timeout";
await assert.rejects(client.create({}), (e) => e.uncertain === true);
assert.equal(creates, 1, "Creation timeout never automatically retries");
mode = "ok";
assert.match((await client.label("EKART-1")).toString(), /^%PDF-/);
assert.ok(requests.some((r) => r.path === "/integrations/v2/auth/token/TEST%2FCLIENT"));
await assert.rejects(
  createEkartClient({
    env: {},
    fetchImpl: () => {
      throw new Error("No transport permitted");
    },
  }).serviceability("411001"),
  /credentials/,
);
assert.ok(!JSON.stringify(await client.serviceability("411001")).includes(env.EKART_PASSWORD));

const config = commerceConfigSchema.parse({
  pricingPlan: "Seller-confirmed Flat",
  pricingConfirmed: true,
  courierGroup: "CONFIRMED",
  serviceType: "SURFACE",
  pickupName: "Seller",
  pickupPhone: "9876543210",
  pickupAddress: "12 Warehouse Road",
  pickupCity: "Mumbai",
  pickupState: "Maharashtra",
  sellerName: "Seller legal name",
  sellerAddress: "12 Billing Road",
  sellerTaxStatus: "UNREGISTERED",
  categoryOfGoods: "Sanitary pads",
});
const parcel = { weightG: 100.5, lengthCm: 10.1, widthCm: 12, heightCm: 2 };
const product = {
  id: 1,
  name: "Pads",
  shippingWeightG: parcel.weightG,
  packageLengthCm: parcel.lengthCm,
  packageWidthCm: parcel.widthCm,
  packageHeightCm: parcel.heightCm,
};
const quote = await calculateShipping(
  {
    items: [{ product, price: 1100, quantity: 1 }],
    pin: "411001",
    payment: "Cash on Delivery",
    discountedProducts: 1100,
    gst: 0,
    donation: 50,
    config,
  },
  createCarrier(client),
);
assert.equal(
  quote.carrierCost,
  61,
  "Configured courier is selected, never the lowest returned rate",
);
assert.equal(quote.codAmount, 1165);
const rateRequests = requests.filter((r) => r.path === "/data/v3/serviceability");
assert.equal(
  rateRequests.at(-1).body.codAmount,
  "1165",
  "Final collectible including fees/donation is re-quoted",
);
assert.equal(rateRequests.at(-1).body.weight, "101");
assert.equal(rateRequests.at(-1).body.length, "11");
await assert.rejects(createCarrier(client).quote({ pricingConfirmed: false }), /confirm/);
const noCod = {
  ...client,
  serviceability: async () => ({ ...v2, details: { ...v2.details, cod: false } }),
};
await assert.rejects(
  calculateShipping(
    {
      items: [{ product, price: 1100, quantity: 1 }],
      pin: "411001",
      payment: "Cash on Delivery",
      discountedProducts: 1100,
      gst: 0,
      donation: 0,
      config,
    },
    createCarrier(noCod),
  ),
  /COD/,
);
const badRate = { ...client, rates: async () => [charge("UNKNOWN")] };
await assert.rejects(
  calculateShipping(
    {
      items: [{ product, price: 1100, quantity: 1 }],
      pin: "411001",
      payment: "UPI",
      discountedProducts: 1100,
      gst: 0,
      donation: 0,
      config,
    },
    createCarrier(badRate),
  ),
  /configured/,
);

const prepaidQuote = {
  ...quote,
  codFee: 0,
  total: 1100,
  parcel,
  carrierCost: 61,
  shippingTax: 10.98,
};
const initialOrder = {
  id: 1,
  order_number: "SR-1001",
  customer_id: 1,
  order_status: "NEW",
  payment_method: "RAZORPAY",
  payment_status: "SUCCESS",
  grand_total: 1100,
  subtotal_amount: 1100,
  discount_amount: 0,
  tax_amount: 0,
  created_at: "2026-10-29T00:00:00Z",
  shipping_name: "Customer",
  shipping_mobile: "9876543210",
  shipping_address_line1: "12 Test Street",
  shipping_address_line2: "",
  shipping_city: "Pune",
  shipping_state: "Maharashtra",
  shipping_pincode: "411001",
  customer_note: JSON.stringify({ commerceVersion: 1, shippingQuote: prepaidQuote }),
};
const items = [{ product_name: "Pads", sku: "PAD", quantity: 1 }];
const payload = buildShipmentPayload(initialOrder, items, config);
const schema = spec.slice(spec.indexOf("    shipment:"), spec.indexOf("    pricing_estimate:"));
const required = schema
  .slice(schema.indexOf("      required:"), schema.indexOf("      properties:"))
  .matchAll(/^        - (\w+)$/gm);
for (const [, field] of required)
  assert.ok(Object.hasOwn(payload, field), `Shipment payload requires ${field}`);
assert.equal(payload.payment_mode, "Prepaid");
assert.equal(payload.cod_amount, 0);
assert.equal(payload.total_amount, payload.taxable_amount + payload.tax_value);
assert.equal(payload.weight, 101);
assert.equal(payload.pickup_location.pin, 400013);
assert.equal(
  buildShipmentPayload({ ...initialOrder, payment_method: "COD", grand_total: 1165 }, items, config)
    .cod_amount,
  1165,
);
assert.throws(
  () =>
    buildShipmentPayload(
      { ...initialOrder, payment_method: "COD", grand_total: 20001 },
      items,
      config,
    ),
  /limits/,
);

function fixture() {
  let order = structuredClone(initialOrder),
    shipment = { order_id: 1, reference: "SR-1001", status: "QUEUED", attempts: 0 },
    allocation = { order_id: 1, inventory_id: 1, quantity: 1, state: "RESERVED" },
    inventory = { id: 1, current_stock: 2, reserved_stock: 1 },
    events = [],
    tail = Promise.resolve(),
    remoteCreates = 0,
    failCreate = false,
    failPersist = false;
  const query = async (sql, v = []) => {
    if (sql.includes("FROM orders WHERE")) {
      assert.match(sql, /FOR UPDATE/);
      return [structuredClone(order)];
    }
    if (sql.includes("FROM ekart_shipments s JOIN orders"))
      return shipment.status === "CREATED" ? [structuredClone(shipment)] : [];
    if (sql.includes("FROM ekart_shipments WHERE")) return [structuredClone(shipment)];
    if (sql.includes("FROM commerce_configuration")) return [{ config: JSON.stringify(config) }];
    if (sql.includes("FROM order_items")) return structuredClone(items);
    if (sql.includes("FROM stock_allocations")) return [structuredClone(allocation)];
    if (sql.includes("FROM inventory")) return [structuredClone(inventory)];
    if (sql.includes("FROM ekart_shipment_events"))
      return structuredClone(events).sort(
        (a, b) => new Date(b.occurred_at) - new Date(a.occurred_at),
      );
    throw new Error("Unexpected fixture query: " + sql);
  };
  const execute = async (sql, v = []) => {
    if (sql.startsWith("UPDATE ekart_shipments SET status = 'PROCESSING'")) {
      shipment.status = "PROCESSING";
      shipment.attempts++;
    } else if (sql.includes("status = 'FAILED'")) {
      shipment.status = "FAILED";
      shipment.last_error = v[0];
    } else if (sql.includes("status = 'CREATED'")) {
      if (failPersist) throw new Error("fake persistence outage");
      Object.assign(shipment, {
        status: "CREATED",
        shipment_id: v[0],
        awb: v.length === 5 ? v[1] : null,
        tracking_url: v.length === 5 ? v[2] : v[1],
      });
    } else if (sql.includes("SET status = ?, last_error")) {
      if (shipment.status === "PROCESSING") {
        shipment.status = v[0];
        shipment.last_error = v[1];
      }
    } else if (sql.startsWith("UPDATE inventory SET current_stock = current_stock -")) {
      inventory.current_stock -= v[0];
      inventory.reserved_stock -= v[1];
    } else if (sql.startsWith("UPDATE stock_allocations")) allocation.state = v[0];
    else if (sql.startsWith("UPDATE orders SET courier_partner")) order.tracking_id = v.at(-3);
    else if (sql.startsWith("INSERT IGNORE INTO ekart_shipment_events")) {
      if (!events.some((e) => e.id === v[1]))
        events.push({ id: v[1], status: v[2], occurred_at: v[3] });
    } else if (sql.startsWith("UPDATE ekart_shipments SET carrier_status"))
      shipment.carrier_status = v[0];
    else if (sql.startsWith("UPDATE orders SET order_status")) order.order_status = v[0];
    else if (
      sql.startsWith("INSERT INTO order_status_history") ||
      sql.startsWith("UPDATE ekart_shipments SET updated_at")
    ) {
    } else throw new Error("Unexpected fixture write: " + sql);
    return [{ affectedRows: 1 }];
  };
  const transaction = (fn) => {
    const result = tail.then(async () => {
      const before = structuredClone({ order, shipment, allocation, inventory, events });
      try {
        return await fn({ query: async (...args) => [await query(...args)], execute });
      } catch (e) {
        ({ order, shipment, allocation, inventory, events } = before);
        throw e;
      }
    });
    tail = result.catch(() => {});
    return result;
  };
  const carrier = {
    serviceability: async () => v2,
    rates: async () => [charge()],
    async create() {
      remoteCreates++;
      if (failCreate) throw Object.assign(new Error("timeout"), { uncertain: true });
      return { status: true, tracking_id: "EKART-1", barcodes: { wbn: "AWB-1" }, vendor: "EKART" };
    },
    track: async () => ({
      "EKART-1": {
        order_id: "SR-1001",
        history: [{ status: "delivered", event_date_iso8601: "2026-10-28T12:00:00Z" }],
      },
    }),
    label: async () => Buffer.from("%PDF-fixture"),
  };
  return {
    transaction,
    query,
    client: carrier,
    state: () => ({ order, shipment, inventory, allocation, events, remoteCreates }),
    fail(value) {
      failCreate = value;
    },
    persistFailure(value) {
      failPersist = value;
    },
    cod() {
      order.payment_method = "COD";
      order.payment_status = "PENDING";
    },
    unpaid() {
      order.payment_status = "PENDING";
    },
  };
}
const f = fixture(),
  options = { client: f.client, env: { EKART_SHIPPING_ENABLED: "true" } };
const concurrent = await Promise.allSettled([
  createShipment(f.transaction, "SR-1001", options),
  createShipment(f.transaction, "SR-1001", options),
]);
assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
assert.equal(f.state().remoteCreates, 1);
await createShipment(f.transaction, "SR-1001", options);
assert.equal(f.state().remoteCreates, 1, "Duplicate request returns stored shipment");
assert.equal(f.state().inventory.current_stock, 1);
assert.match((await shipmentLabel(f.query, "SR-1001", f.client)).toString(), /^%PDF-/);
await syncTracking(f.transaction, "SR-1001", f.client);
await syncTracking(f.transaction, "SR-1001", f.client);
assert.equal(f.state().events.length, 1, "Repeated tracking fetch never duplicates events");
assert.equal(f.state().order.order_status, "DELIVERED");
assert.equal(f.state().order.payment_status, "SUCCESS");
const uncertain = fixture();
uncertain.fail(true);
await assert.rejects(
  createShipment(uncertain.transaction, "SR-1001", {
    client: uncertain.client,
    env: { EKART_SHIPPING_ENABLED: "true" },
  }),
  /unknown/,
);
assert.equal(uncertain.state().shipment.status, "UNKNOWN");
await assert.rejects(
  createShipment(uncertain.transaction, "SR-1001", {
    client: uncertain.client,
    env: { EKART_SHIPPING_ENABLED: "true" },
  }),
  /reconciliation/,
);
assert.equal(uncertain.state().remoteCreates, 1);
await reconcileShipment(uncertain.transaction, "SR-1001", "EKART-1", uncertain.client);
assert.equal(uncertain.state().shipment.status, "CREATED");
assert.equal(uncertain.state().remoteCreates, 1);
const outage = fixture();
outage.persistFailure(true);
await assert.rejects(
  createShipment(outage.transaction, "SR-1001", {
    client: outage.client,
    env: { EKART_SHIPPING_ENABLED: "true" },
  }),
  /unknown/,
);
assert.equal(outage.state().shipment.status, "UNKNOWN");
const unpaid = fixture();
unpaid.unpaid();
await assert.rejects(
  createShipment(unpaid.transaction, "SR-1001", {
    client: unpaid.client,
    env: { EKART_SHIPPING_ENABLED: "true" },
  }),
  /verified paid/,
);
assert.equal(unpaid.state().remoteCreates, 0);
await assert.rejects(
  createShipment(f.transaction, "SR-1001", {
    client: f.client,
    env: { EKART_SHIPPING_ENABLED: "false" },
  }),
  /disabled/,
);
assert.throws(
  () => trackingEvents({ "EKART-1": { order_id: "OTHER", history: [] } }, "EKART-1", "SR-1001"),
  /identity/,
);
assert.equal(
  trackingEvents(
    {
      "EKART-1": {
        order_id: "SR-1001",
        history: [{ status: "unknown new event", event_date_iso8601: "2026-10-28T12:00:00Z" }],
      },
    },
    "EKART-1",
    "SR-1001",
  )[0].orderStatus,
  undefined,
  "Unknown carrier events never invent fulfillment status",
);
console.log(
  "PASS: YAML paths/payload fields, token caching/expiry/401 refresh, read retries, disabled shipping, non-retried creation timeouts, V2/V3 serviceability/rates, exact courier selection, final COD amount, PDF labels, shipment idempotency, unknown-outcome/persistence failures, reconciliation, duplicate tracking events and identity guards. No real network/database used.",
);

const codFixture = fixture();
codFixture.cod();
await createShipment(codFixture.transaction, "SR-1001", {
  client: codFixture.client,
  env: { EKART_SHIPPING_ENABLED: "true" },
});
await syncTracking(codFixture.transaction, "SR-1001", codFixture.client);
assert.equal(codFixture.state().order.order_status, "DELIVERED");
assert.equal(
  codFixture.state().order.payment_status,
  "PENDING",
  "Delivery alone never marks COD paid",
);
