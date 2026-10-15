import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createAdminCookie } from "../api/_admin-session.mjs";

// Exercise the production admin handler and public handler with isolated data.
process.env.ADMIN_SESSION_SECRET = "reviews-test-session-secret-at-least-32-characters";
for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]) process.env[key] = "test";
const reviews = [1, 2, 3].map((id) => ({
  id, rating: id + 2, review_text: `Review number ${id}`, status: "PENDING",
  customer_name: "Customer", product_name: "Day Pads", product_slug: "day-pads",
  order_number: "SR-ONE", order_status: "DELIVERED", created_at: new Date("2026-10-15T00:00:00Z"),
  deleted_at: id === 3 ? new Date() : null,
}));
let queries = 0;
let writes = 0;
const pool = {
  async query(sql) {
    queries++;
    assert.match(sql, /FROM reviews r/);
    assert.match(sql, /r.deleted_at IS NULL/);
    let selected = reviews.filter((review) => !review.deleted_at);
    if (sql.includes("r.status = 'APPROVED'")) {
      assert.match(sql, /o.order_status = 'DELIVERED'/);
      assert.match(sql, /p.deleted_at IS NULL/);
      assert.match(sql, /o.deleted_at IS NULL/);
      selected = selected.filter((review) => review.status === "APPROVED" && review.order_status === "DELIVERED");
    }
    return [structuredClone(selected)];
  },
  async execute(sql, params) {
    writes++;
    assert.match(sql, /^UPDATE reviews SET status = \?, moderated_at = NOW\(\)/);
    assert.match(sql, /WHERE id = \? AND deleted_at IS NULL/);
    const review = reviews.find((review) => String(review.id) === params[1] && !review.deleted_at);
    if (!review) return [{ affectedRows: 0 }];
    review.status = params[0];
    return [{ affectedRows: 1 }];
  },
};
globalThis.__reviewsTestPool = pool;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
let adminSource = readFileSync(new URL("../api/admin/[module].mjs", import.meta.url), "utf8")
  .replace('import { createPool } from "mysql2/promise";', "const createPool = () => globalThis.__reviewsTestPool;");
for (const name of ["_admin-session", "_admin-orders", "_admin-errors", "_reviews"]) {
  adminSource = adminSource.replace(`"../${name}.mjs"`, JSON.stringify(new URL(`../api/${name}.mjs`, import.meta.url).href));
}
const { default: admin } = await import(moduleUrl(adminSource));
const cookie = createAdminCookie().split(";")[0];
async function request(method = "GET", body, authenticated = true) {
  const req = {
    method, query: { module: "reviews" }, headers: { cookie: authenticated ? cookie : "" },
    async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body || {})); },
  };
  const res = { statusCode: 200, payload: undefined,
    setHeader() {}, status(value) { this.statusCode = value; return this; }, json(value) { this.payload = value; } };
  await admin(req, res);
  return res;
}
let publicSource = readFileSync(new URL("../src/server/reviews.server.ts", import.meta.url), "utf8")
  .replace('import { getProduct } from "@/lib/catalog";', 'const getProduct = () => undefined;')
  .replace('import { database } from "./database.server";', 'const database = () => { throw new Error("MySQL requests must not use SQLite"); };')
  .replace('"../../api/_reviews.mjs"', JSON.stringify(new URL("../api/_reviews.mjs", import.meta.url).href))
  .replace('"./mysql.server"', JSON.stringify(moduleUrl("export const queryRows = async (sql) => (await globalThis.__reviewsTestPool.query(sql))[0];")));
publicSource = ts.transpileModule(publicSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { handleReviewsRequest } = await import(moduleUrl(publicSource));
async function publicReviews() {
  const response = await handleReviewsRequest();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return (await response.json()).reviews;
}

assert.equal((await request("GET", undefined, false)).statusCode, 401);
assert.equal((await request("POST", { reviewId: "1", status: "APPROVED" }, false)).statusCode, 401);
assert.equal(queries, 0);
assert.equal(writes, 0);
let response = await request();
assert.equal(response.statusCode, 200);
assert.equal(response.payload.rows.length, 2);
assert.equal(response.payload.rows[0][5], "1");
assert.equal(response.payload.metrics.find((metric) => metric.label === "Pending").value, "2");
assert.deepEqual(await publicReviews(), [], "Pending reviews must stay private");
response = await request("POST", { reviewId: "2", status: "APPROVED" });
assert.equal(response.statusCode, 200);
assert.equal(reviews[0].status, "PENDING", "Identical product/order names must not select the wrong review");
assert.equal(reviews[1].status, "APPROVED");
assert.deepEqual(await publicReviews(), [{
  orderId: "SR-ONE", customerName: "Customer", productName: "Day Pads", productSlug: "day-pads",
  rating: 4, reviewText: "Review number 2", reviewedAt: "2026-10-15T00:00:00.000Z",
}]);
await request("POST", { reviewId: "2", status: "REJECTED" });
assert.deepEqual(await publicReviews(), [], "Reject must remove a previously approved review");
await request("POST", { reviewId: "2", status: "APPROVED" });
await request("POST", { reviewId: "2", status: "PENDING" });
assert.deepEqual(await publicReviews(), [], "Moving back to pending must hide the review");
assert.equal((await request("POST", { reviewId: "1", status: "INVALID" })).statusCode, 400);
assert.equal((await request("POST", { reviewId: "1 OR 1=1", status: "APPROVED" })).statusCode, 400);
assert.equal((await request("POST", { reviewId: "3", status: "APPROVED" })).statusCode, 404);
assert.equal((await request("POST", { reviewId: "999", status: "APPROVED" })).statusCode, 404);
await request("POST", { reviewId: "1", status: "APPROVED" });
reviews[0].order_status = "CANCELLED";
assert.deepEqual(await publicReviews(), [], "Reviews on non-delivered orders must stay hidden");
reviews[0].order_status = "DELIVERED";
reviews[0].deleted_at = new Date();
assert.deepEqual(await publicReviews(), [], "Deleted reviews must stay hidden");
delete globalThis.__reviewsTestPool;
console.log("PASS: admin authentication, review listing, stable review IDs, approve/reject/pending, public visibility, and deleted/non-delivered filtering.");
