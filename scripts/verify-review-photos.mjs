import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createAdminCookie } from "../api/_admin-session.mjs";
import { validateReviewPhotos, reviewPhotoUrls } from "../api/_review-photos.mjs";
import { reviewsPayload, approvedReviews } from "../api/_reviews.mjs";

process.env.ADMIN_SESSION_SECRET = "review-photos-test-admin-secret-32-characters";
const photo =
  "data:image/png;base64," + Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]).toString("base64");
const row = {
  id: 123,
  customer_id: 42,
  status: "PENDING",
  order_status: "DELIVERED",
  review_images: JSON.stringify([photo]),
  rating: 5,
  review_text: "Comfortable pads",
  product_slug: "test-pad",
  created_at: new Date(),
};
assert.deepEqual(reviewPhotoUrls(row), ["/api/reviews/image?review=123&index=0"]);
assert.deepEqual(validateReviewPhotos(reviewPhotoUrls(row), [photo], 123), [photo]);
assert.throws(() => validateReviewPhotos(["/api/reviews/image?review=999&index=0"], [photo], 123));
assert.throws(() => validateReviewPhotos([photo, photo, photo, photo]));
assert.throws(() => validateReviewPhotos(["data:image/svg+xml;base64,PHN2Zz4="]));
assert.throws(() => validateReviewPhotos(["data:image/png;base64,SGVsbG8="]));
assert.throws(() => validateReviewPhotos(["data:image/png;base64," + "A".repeat(410000)]));
let user = null,
  fail = false;
globalThis.__reviewPhotoQuery = async (sql, params) => {
  assert.match(sql, /r.deleted_at IS NULL/);
  assert.match(sql, /o.deleted_at IS NULL/);
  assert.match(sql, /p.deleted_at IS NULL/);
  assert.deepEqual(params, ["123"]);
  if (fail) throw new Error("Private details");
  return [{ ...row }];
};
globalThis.__reviewPhotoUser = () => user;
const url = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
let source = readFileSync("src/server/review-image.server.ts", "utf8")
  .replace(
    'import { queryRows } from "./mysql.server";',
    "const queryRows = (...args) => globalThis.__reviewPhotoQuery(...args);",
  )
  .replace(
    'import { mysqlSessionUser } from "./customer.server";',
    "const mysqlSessionUser = async () => globalThis.__reviewPhotoUser();",
  );
for (const name of ["_admin-session", "_review-photos"])
  source = source.replace(
    `"../../api/${name}.mjs"`,
    JSON.stringify(new URL(`../api/${name}.mjs`, import.meta.url).href),
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { handleReviewImageRequest } = await import(url(compiled));
const request = (cookie = "", method = "GET", query = "review=123&index=0") =>
  handleReviewImageRequest(
    new Request(`https://example.test/api/reviews/image?${query}`, { method, headers: { cookie } }),
  );
assert.equal((await request()).status, 404, "Pending images are private");
user = { id: 99 };
assert.equal((await request()).status, 404);
user = { id: 42 };
let response = await request();
assert.equal(response.status, 200);
assert.equal(response.headers.get("content-type"), "image/png");
assert.match(response.headers.get("cache-control"), /no-store/);
assert.equal((await response.arrayBuffer()).byteLength, 9);
user = null;
assert.equal((await request(createAdminCookie().split(";")[0])).status, 200);
row.status = "APPROVED";
assert.equal((await request()).status, 200);
assert.equal(await (await request("", "HEAD")).text(), "");
row.order_status = "CANCELLED";
assert.equal((await request()).status, 404);
row.order_status = "DELIVERED";
row.status = "REJECTED";
assert.equal(
  (await request()).status,
  404,
  "Previously approved photos immediately become private",
);
assert.equal((await request("", "POST")).status, 405);
assert.equal((await request("", "GET", "review=123&index=3")).status, 400);
fail = true;
assert.equal((await request()).status, 503);
const query = async (sql) =>
  sql.includes("r.status = 'APPROVED'") && row.status !== "APPROVED" ? [] : [row];
assert.deepEqual(await approvedReviews(query), []);
const admin = await reviewsPayload(query);
assert.match(admin.rows[0][6], /review=123/);
assert.ok(!JSON.stringify(admin).includes("data:image"));
row.status = "APPROVED";
const publicRows = await approvedReviews(query);
assert.equal(publicRows[0].productSlug, "test-pad");
assert.deepEqual(publicRows[0].photos, reviewPhotoUrls(row));
assert.ok(!JSON.stringify(publicRows).includes("data:image"));
console.log(
  "PASS: review photo limits/types, owner/admin access, moderation visibility, no-cache revocation and product association.",
);
