process.env.EKART_SHIPPING_ENABLED = "false";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {
  commerceConfigSchema,
  selectPackage,
  reserveStock,
  transitionStock,
  queueShipment,
  productTax,
  validateCoupon,
  expireUnpaidOrder,
} from "../api/_commerce.mjs";
import { calculateShipping, tokenCache, ekartCarrier } from "../api/_shipping.mjs";
import { shippingAdminAction } from "../api/_shipping-admin.mjs";
const source = ts.transpileModule(fs.readFileSync("src/lib/checkout-rules.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { codEligibility } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
for (const [amount, eligible] of [
  [999, false],
  [1000, false],
  [1001, true],
  [19999, true],
  [20000, true],
  [20001, false],
])
  assert.equal(codEligibility(amount, amount, true).eligible, eligible);
assert.equal(
  codEligibility(999, 1100, true).eligible,
  false,
  "Donation and shipping do not meet minimum",
);
assert.equal(codEligibility(20000, 20001, true).eligible, false, "Charges count toward maximum");
assert.equal(codEligibility(1100, 1100, false).eligible, false, "Prepaid-only PIN rejects COD");
assert.equal(codEligibility(990, 990, true).eligible, false, "Discount can remove COD eligibility");
const product = {
  id: 1,
  name: "Pads",
  shippingWeightG: 100,
  packageLengthCm: 10,
  packageWidthCm: 12,
  packageHeightCm: 2,
  gstPercent: 0,
};
const items = [{ product, price: 1100, quantity: 1 }];
const config = commerceConfigSchema.parse({ pricingPlan: "ACCOUNT_CONFIRMED" });
assert.throws(
  () => selectPackage([{ product: { ...product, shippingWeightG: null }, quantity: 1 }], []),
  /configuration/,
);
assert.throws(() => selectPackage([{ product, quantity: 2 }], []), /validated package/);
const box = {
  name: "Verified two-pack box",
  maxUnits: 2,
  maxWeightG: 300,
  tareWeightG: 20,
  lengthCm: 15,
  widthCm: 15,
  heightCm: 8,
};
assert.deepEqual(selectPackage([{ product, quantity: 2 }], [box]), {
  weightG: 220,
  lengthCm: 15,
  widthCm: 15,
  heightCm: 8,
});
const carrier = {
  async quote(input) {
    assert.equal(input.pickupPin, "400013");
    assert.equal(input.pricingPlan, "ACCOUNT_CONFIRMED");
    return {
      prepaidAvailable: true,
      codAvailable: true,
      pricingPlan: input.pricingPlan,
      carrierCost: 61,
      codFee: 15,
      shippingTax: 10.98,
    };
  },
};
const request = {
  items,
  pin: "411001",
  payment: "UPI",
  discountedProducts: 1100,
  donation: 50,
  gst: 0,
  config,
};
let quote = await calculateShipping(request, carrier);
assert.equal(quote.total, 1150);
assert.equal(quote.carrierCost, 61, "Free shipping retains internal cost");
quote = await calculateShipping({ ...request, payment: "Cash on Delivery" }, carrier);
assert.equal(quote.codAmount, 1165);
assert.equal(quote.codFee, 15);
quote = await calculateShipping(
  { ...request, config: { ...config, shippingPolicy: "CARRIER" } },
  carrier,
);
assert.equal(quote.shippingAmount, 71.98);
assert.equal(quote.total, 1221.98);
for (const response of [
  { prepaidAvailable: false, codAvailable: false },
  { prepaidAvailable: true, codAvailable: false },
]) {
  const c = {
    quote: async () => ({
      ...(await carrier.quote({ pickupPin: "400013", pricingPlan: config.pricingPlan })),
      ...response,
    }),
  };
  await assert.rejects(
    calculateShipping({ ...request, payment: "Cash on Delivery" }, c),
    /unavailable/,
  );
}
await assert.rejects(calculateShipping({ ...request, pin: "000000" }, carrier), /PIN/);
await assert.rejects(
  calculateShipping(request, {
    quote: async () => {
      throw new Error("Timeout");
    },
  }),
  /Timeout/,
);
await assert.rejects(calculateShipping(request, ekartCarrier), /confirm/);
await assert.rejects(ekartCarrier.create({}), /disabled/);
assert.equal(
  productTax([{ product: { ...product, gstPercent: 5 }, price: 100, quantity: 2 }], {
    discount: 20,
    eligibleProductIds: ["1"],
    eligibleSubtotal: 200,
  }),
  9,
);

let now = 0,
  authCalls = 0;
const cache = tokenCache(
  async () => ({ token: `token-${++authCalls}`, expiresAt: now + 120000 }),
  () => now,
);
assert.deepEqual(await Promise.all([cache.get(), cache.get()]), ["token-1", "token-1"]);
now = 100000;
assert.equal(await cache.get(), "token-2");
cache.clear();
assert.equal(await cache.get(), "token-3");

// Serialized transaction model verifies SQL lock intent, concurrency, rollback and idempotent transitions.
let stock = { id: 1, current_stock: 1, reserved_stock: 0 },
  allocations = [],
  shipments = new Map(),
  tail = Promise.resolve();
const connection = {
  async query(sql, values) {
    if (sql.includes("FROM inventory WHERE product_id")) {
      assert.match(sql, /FOR UPDATE/);
      return [[structuredClone(stock)]];
    }
    if (sql.includes("FROM stock_allocations"))
      return [structuredClone(allocations.filter((a) => a.order_id === values[0]))];
    if (sql.includes("FROM inventory WHERE id")) return [[structuredClone(stock)]];
    throw new Error(`Unexpected SQL ${sql}`);
  },
  async execute(sql, v) {
    if (sql.includes("reserved_stock = reserved_stock +")) stock.reserved_stock += v[0];
    else if (sql.startsWith("INSERT INTO stock_allocations"))
      allocations.push({ order_id: v[0], inventory_id: v[1], quantity: v[2], state: "RESERVED" });
    else if (sql.includes("current_stock = current_stock -")) {
      stock.current_stock -= v[0];
      stock.reserved_stock -= v[1];
    } else if (sql.includes("current_stock = current_stock +")) stock.current_stock += v[0];
    else if (sql.includes("reserved_stock = reserved_stock -")) stock.reserved_stock -= v[0];
    else if (sql.startsWith("UPDATE stock_allocations"))
      allocations.find((a) => a.order_id === v[1]).state = v[0];
    else if (sql.includes("INSERT IGNORE INTO ekart_shipments")) {
      if (!shipments.has(v[0])) shipments.set(v[0], v);
    } else throw new Error(`Unexpected SQL ${sql}`);
    return [{ affectedRows: 1 }];
  },
};
const transaction = (fn) => {
  const result = tail.then(async () => {
    const before = structuredClone({ stock, allocations });
    try {
      return await fn(connection);
    } catch (e) {
      ({ stock, allocations } = before);
      throw e;
    }
  });
  tail = result.catch(() => {});
  return result;
};
const concurrent = await Promise.allSettled([
  transaction((c) => reserveStock(c, 1, items, true)),
  transaction((c) => reserveStock(c, 2, items, true)),
]);
assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
assert.equal(stock.reserved_stock, 1);
await transaction((c) => transitionStock(c, 1, "commit"));
await transaction((c) => transitionStock(c, 1, "commit"));
assert.equal(stock.current_stock, 0);
assert.equal(stock.reserved_stock, 0);
await transaction((c) => transitionStock(c, 1, "restock"));
await transaction((c) => transitionStock(c, 1, "restock"));
assert.equal(stock.current_stock, 1);
await assert.rejects(
  transaction(async (c) => {
    await reserveStock(c, 3, items, true);
    throw new Error("Simulated save failure");
  }),
  /save failure/,
);
assert.equal(stock.reserved_stock, 0);
await transaction((c) => reserveStock(c, 4, items, true));
await transaction((c) => transitionStock(c, 4, "release"));
assert.equal(stock.reserved_stock, 0);
const order = {
  id: 5,
  order_number: "SR-1005",
  payment_method: "COD",
  payment_status: "PENDING",
  order_status: "NEW",
  grand_total: 1165,
};
await queueShipment(connection, order);
await queueShipment(connection, order);
assert.equal(shipments.size, 1);
assert.equal(shipments.get(5)[2], 1165);
await queueShipment(connection, { ...order, id: 6, payment_method: "RAZORPAY" });
assert.equal(shipments.size, 1, "Unpaid online order never queues shipment");
await assert.rejects(
  shippingAdminAction(transaction, { action: "retry", orderId: "SR-1005" }),
  /disabled/,
);
await assert.rejects(
  shippingAdminAction(transaction, {
    action: "verify-cod",
    orderId: "SR-1005",
    evidence: "",
    confirmed: true,
  }),
  /evidence/,
);
const coupon = {
  id: 1,
  discount_type: "PERCENTAGE",
  discount_value: 10,
  minimum_order_amount: 0,
  maximum_discount_amount: null,
  usage_limit: 1,
  usage_limit_per_customer: null,
  first_order_only: 0,
};
const couponConnection = {
  query: async (sql) =>
    sql.includes("FROM coupons")
      ? [[coupon]]
      : sql.includes("FROM coupon_usage")
        ? [[{ total: 1, customer_total: 1 }]]
        : [[]],
};
await assert.rejects(validateCoupon(couponConnection, "SAVE", 1, items), /usage limit/);
coupon.usage_limit = null;
coupon.first_order_only = 1;
couponConnection.query = async (sql) =>
  sql.includes("FROM coupons")
    ? [[coupon]]
    : sql.includes("FROM coupon_usage")
      ? [[{ total: 0, customer_total: 0 }]]
      : sql.includes("FROM orders")
        ? [[{ id: 1 }]]
        : [[]];
await assert.rejects(validateCoupon(couponConnection, "SAVE", 1, items), /first order/);
coupon.first_order_only = 0;
couponConnection.query = async (sql) =>
  sql.includes("FROM coupons")
    ? [[coupon]]
    : sql.includes("FROM coupon_usage")
      ? [[{ total: 0, customer_total: 0 }]]
      : sql.includes("FROM coupon_products")
        ? [[{ product_id: 99 }]]
        : [[]];
await assert.rejects(validateCoupon(couponConnection, "SAVE", 1, items), /eligible/);
assert.equal(
  await expireUnpaidOrder(
    {
      query: async () => [
        [{ payment_method: "RAZORPAY", payment_status: "SUCCESS", order_status: "NEW" }],
      ],
    },
    1,
  ),
  false,
  "Paid stock never expires",
);
console.log(
  "PASS: COD boundaries, discounted basis, collectible charges, packaging, rate failures, unsupported/prepaid-only PINs, carrier-cost retention, tax, token cache, stock concurrency/rollback/retries, duplicate queueing, unpaid shipment guard, settlement evidence and coupon restrictions. All carrier/database operations mocked.",
);
