import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Run after npm run build. Uses only a temporary SQLite database; no live services.
for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "VERCEL"])
  delete process.env[key];
process.env.SHERISE_DATABASE_PATH = join(
  mkdtempSync(join(tmpdir(), "sherise-order-numbers-")),
  "orders.sqlite",
);
process.env.APP_ORIGIN = "http://orders.test";
const { handleProductionApiRequest } = await import("../dist/server/production-api.js");
let cookie = "";
async function call(action, body) {
  const response = await handleProductionApiRequest(
    new Request(`http://orders.test/api/customer/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", Origin: "http://orders.test", cookie },
      body: JSON.stringify(body),
    }),
  );
  const result = await response.json();
  assert.ok(response.ok, JSON.stringify({ status: response.status, result }));
  if (action === "register") cookie = response.headers.get("set-cookie").split(";")[0];
  return result;
}
const registered = await call("register", {
  name: "Sequence Test",
  email: "sequence@example.test",
  phone: "9876543210",
  whatsappNumber: "9876543210",
  password: "SequenceTest!2026",
  remember: true,
});
const input = {
  requestId: crypto.randomUUID(),
  address: {
    name: "Sequence Test",
    phone: "9876543210",
    line1: "12 Test Street",
    line2: "",
    city: "Pune",
    state: "Maharashtra",
    pin: "411001",
    label: "Home",
    isDefault: true,
  },
  items: [
    {
      slug: "isolated-test-item",
      name: "Isolated test item",
      size: "XL",
      flow: "Medium",
      pack: "Test pack",
      quantity: 10,
      price: 100,
    },
  ],
  coupon: "",
  payment: "Cash on Delivery",
};
const db = new DatabaseSync(process.env.SHERISE_DATABASE_PATH);
const legacyId = "SR-068A01F779CC62223B631AF55BAAD7E9";
const legacyRequest = crypto.randomUUID();
db.prepare("INSERT INTO orders VALUES (?, ?, ?, ?)").run(
  legacyId,
  registered.user.id,
  legacyRequest,
  JSON.stringify({ id: legacyId }),
);
assert.equal(
  (await call("order-create", { ...input, requestId: legacyRequest })).order.id,
  legacyId,
);
const first = (await call("order-create", input)).order;
assert.equal(first.id, "SR-1001");
assert.equal((await call("order-create", input)).order.id, first.id);
const concurrentRetry = { ...input, requestId: crypto.randomUUID() };
const repeated = await Promise.all([
  call("order-create", concurrentRetry),
  call("order-create", concurrentRetry),
]);
assert.deepEqual(
  repeated.map(({ order }) => order.id),
  ["SR-1002", "SR-1002"],
);
const separate = await Promise.all([
  call("order-create", { ...input, requestId: crypto.randomUUID() }),
  call("order-create", { ...input, requestId: crypto.randomUUID() }),
]);
assert.deepEqual(separate.map(({ order }) => order.id).sort(), ["SR-1003", "SR-1004"]);
db.prepare("DELETE FROM orders WHERE id = ?").run("SR-1004");
assert.equal(
  (await call("order-create", { ...input, requestId: crypto.randomUUID() })).order.id,
  "SR-1005",
  "Deleted numbers must not be reused",
);
assert.equal(
  db.prepare("SELECT data FROM orders WHERE id = ?").get(legacyId).data,
  JSON.stringify({ id: legacyId }),
);
db.close();
console.log(
  "PASS: SQLite sequential numbers, simultaneous checkouts, concurrent retries, no reuse after deletion, and preserved legacy orders. No live services used.",
);
