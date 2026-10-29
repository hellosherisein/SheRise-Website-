import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAdminCookie } from "../api/_admin-session.mjs";
import { adminErrorResponse } from "../api/_admin-errors.mjs";

// Test the production handler with an isolated adapter, without accessing a real database.
process.env.ADMIN_SESSION_SECRET = "admin-orders-test-secret-at-least-32-characters";
for (const name of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"])
  process.env[name] = "test";
let orders = [];
let items = [];
let history = [];
let failHistory = false;
let queries = 0;
let released = 0;
const updates = [];
const pool = {
  async query(sql, params = []) {
    queries++;
    if (sql.includes("FROM order_items"))
      return [
        items.filter((item) =>
          orders.some((order) => order.id === item.order_id && !order.deleted_at),
        ),
      ];
    if (sql.includes("FROM orders"))
      return [
        structuredClone(
          orders
            .filter(
              (order) => !order.deleted_at && (!params.length || order.order_number === params[0]),
            )
            .toReversed(),
        ),
      ];
    throw new Error(`Unexpected SQL: ${sql}`);
  },
  async getConnection() {
    let snapshot;
    return {
      query: pool.query,
      async beginTransaction() {
        snapshot = structuredClone({ orders, history });
      },
      async commit() {},
      async rollback() {
        ({ orders, history } = snapshot);
      },
      release() {
        released++;
      },
      async execute(sql, params) {
        if (sql.startsWith("UPDATE orders")) {
          // Reproduce the production failure when a prepared string parameter
          // is compared with a literal under different connection collations.
          if (/\?\s*=\s*'(SHIPPED|DELIVERED|CANCELLED)'/.test(sql)) {
            throw Object.assign(new Error("Illegal mix of collations for operation '='"), {
              code: "ER_CANT_AGGREGATE_2COLLATIONS",
            });
          }
          assert.equal(params.length, 2);
          updates.push({ sql, status: params[0] });
          orders.find((order) => order.id === params[1]).order_status = params[0];
          return [{ affectedRows: 1 }];
        }
        if (sql.includes("INSERT INTO order_status_history")) {
          assert.match(sql, /previous_status/);
          if (failHistory) throw new Error("Simulated history failure");
          history.push(params);
          return [{ affectedRows: 1 }];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      },
    };
  },
};
globalThis.__adminOrdersTestPool = pool;
let source = readFileSync(new URL("../api/admin/[module].mjs", import.meta.url), "utf8").replace(
  'import { createPool } from "mysql2/promise";',
  "const createPool = () => globalThis.__adminOrdersTestPool;",
);
for (const name of [
  "_ekart-shipments",
  "_commerce",
  "_shipping-admin",
  "_admin-session",
  "_admin-orders",
  "_admin-errors",
  "_reviews",
  "_popup-leads",
  "_blogs",
  "_newsletter",
]) {
  source = source.replace(
    `"../${name}.mjs"`,
    JSON.stringify(new URL(`../api/${name}.mjs`, import.meta.url).href),
  );
}
const { default: handler } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const cookie = createAdminCookie().split(";")[0];
async function request(method = "GET", body, authenticated = true, module = "orders") {
  const req = {
    method,
    query: { module },
    headers: { cookie: authenticated ? cookie : "" },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify(body || {}));
    },
  };
  const res = {
    statusCode: 200,
    payload: undefined,
    setHeader() {},
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
    end() {},
  };
  await handler(req, res);
  return res;
}

assert.equal((await request("GET", undefined, false)).statusCode, 401);
assert.equal(queries, 0, "Unauthorized requests must not access orders");
let response = await request();
assert.equal(response.statusCode, 200);
assert.deepEqual(response.payload.rows, []);
assert.equal(response.payload.metrics[0].value, "0");
orders = [
  {
    id: 1,
    order_number: "SR-ONE",
    customer_name: "Customer One",
    grand_total: "1200.50",
    payment_method: "COD",
    order_status: "NEW",
  },
  {
    id: 2,
    order_number: "SR-TWO",
    customer_name: "Customer Two",
    grand_total: "499.00",
    payment_method: "UPI",
    order_status: "DELIVERED",
  },
  { id: 3, order_number: "SR-DELETED", deleted_at: "2026-01-01", order_status: "NEW" },
];
items = [
  { order_id: 1, product_name: "Day pads", quantity: 2 },
  { order_id: 1, product_name: "Night pads", quantity: 1 },
  { order_id: 2, product_name: "Day pads", quantity: 1 },
];
response = await request();
assert.equal(response.payload.source, "mysql");
assert.equal(response.payload.rows.length, 2);
assert.deepEqual(response.payload.rows[1], [
  "SR-ONE",
  "Customer One",
  "Day pads x2, Night pads x1",
  "Rs.1,200.5",
  "Cash on Delivery",
  "NEW",
  "PENDING",
  "-",
  "-",
  "-",
]);
assert.equal(response.payload.metrics[1].value, "1");
response = await request("POST", { orderId: "SR-ONE", status: "packed" });
assert.equal(response.statusCode, 200);
assert.equal(response.payload.rows[1][5], "PACKED");
assert.deepEqual(history[0], [1, "NEW", "PACKED", "Status updated from admin orders."]);
await request("POST", { orderId: "SR-ONE", status: "packed" });
assert.equal(history.length, 1, "Repeating a status must not duplicate history");
assert.equal((await request("POST", { orderId: "SR-ONE", status: "invalid" })).statusCode, 400);
assert.equal((await request("POST", { orderId: "SR-MISSING", status: "shipped" })).statusCode, 404);
assert.equal((await request("POST", { orderId: "SR-DELETED", status: "packed" })).statusCode, 404);
failHistory = true;
assert.equal((await request("POST", { orderId: "SR-ONE", status: "shipped" })).statusCode, 500);
assert.equal(orders[0].order_status, "PACKED", "Failed history must roll back the status");
assert.equal(released, 5, "Connections must be released after success and failure");
failHistory = false;
for (const [status, expected] of [
  ["shipped", "SHIPPED"],
  ["delivered", "DELIVERED"],
  ["cancelled", "CANCELLED"],
]) {
  response = await request("POST", { orderId: "SR-ONE", status });
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.rows[1][5], expected);
}
for (const { sql, status } of updates) {
  assert.equal(
    sql.includes("dispatched_at = COALESCE(dispatched_at, NOW())"),
    status === "SHIPPED",
  );
  assert.ok(
    sql.includes(
      status === "DELIVERED"
        ? "delivered_at = COALESCE(delivered_at, NOW())"
        : "delivered_at = NULL",
    ),
  );
  assert.ok(
    sql.includes(
      status === "CANCELLED"
        ? "cancelled_at = COALESCE(cancelled_at, NOW())"
        : "cancelled_at = NULL",
    ),
  );
}
assert.equal(history.length, 4);
assert.equal(
  (await request("POST", { orderId: "SR-ONE", status: "preview" })).statusCode,
  409,
  "Closed orders cannot be reopened without a new stock allocation",
);
orders.push({
  id: 4,
  order_number: "SR-UNPAID",
  customer_name: "Online Customer",
  grand_total: "499.00",
  payment_method: "RAZORPAY",
  payment_status: "PENDING",
  order_status: "NEW",
});
assert.equal(
  (await request("POST", { orderId: "SR-UNPAID", status: "packed" })).statusCode,
  409,
  "An unpaid online order must not be fulfilled",
);

for (const [code, status, description] of [
  ["ECONNREFUSED", 503, "Database is unavailable"],
  ["ER_ACCESS_DENIED_ERROR", 503, "Database login or access was denied"],
  ["ER_TABLEACCESS_DENIED_ERROR", 500, "does not have permission"],
  ["ER_BAD_FIELD_ERROR", 500, "schema does not match"],
  ["ER_NO_SUCH_TABLE", 500, "schema does not match"],
  ["WARN_DATA_TRUNCATED", 500, "database rejected"],
  ["ER_CANT_AGGREGATE_2COLLATIONS", 500, "collations conflict"],
  ["ER_DUP_ENTRY", 409, "already exists"],
]) {
  const result = adminErrorResponse(
    Object.assign(new Error("private SQL and credentials"), { code }),
  );
  assert.equal(result.status, status);
  assert.equal(result.body.errorCode, code);
  assert.ok(result.body.error.includes(description));
  assert.ok(!result.body.error.includes("private SQL"));
}
assert.equal(adminErrorResponse(new Error("private SQL")).body.errorCode, "ADMIN_REQUEST_FAILED");
delete globalThis.__adminOrdersTestPool;
console.log(
  "Admin orders: authenticated listing, item grouping, status updates, validation, and rollback passed.",
);

for (const module of ["shipping-settings", "shipping-orders", "shipping-label"]) {
  const before = queries;
  assert.equal((await request("GET", undefined, false, module)).statusCode, 401);
  assert.equal((await request("POST", { action: "verify-cod" }, false, module)).statusCode, 401);
  assert.equal(queries, before, "Unauthorized shipping actions must never query the database");
}
