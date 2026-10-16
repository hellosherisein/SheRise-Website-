import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Actual image request handler, isolated DB adapter; no production data changes.
const bytes = Buffer.from("test raster image bytes");
let stored = `data:image/png;base64,${bytes.toString("base64")}`;
let queries = 0, fail = false;
globalThis.__catalogImageQuery = async (sql, params) => {
  queries++;
  assert.deepEqual(params, ["123"]);
  assert.match(sql, /pi.id = \?/);
  assert.match(sql, /p.status = 'ACTIVE'/);
  assert.match(sql, /p.deleted_at IS NULL AND c.deleted_at IS NULL/);
  if (fail) throw new Error("Private database details");
  return stored === null ? [] : [{ image_url: stored }];
};
const source = readFileSync("src/server/catalog-image.server.ts", "utf8")
  .replace('import { queryRows } from "./mysql.server";', "const queryRows = (...args) => globalThis.__catalogImageQuery(...args);");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { handleCatalogImageRequest } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const request = (query = "id=123", method = "GET") => handleCatalogImageRequest(new Request(`https://example.test/api/catalog/product-image?${query}`, { method }));
let response = await request();
assert.equal(response.status, 200);
assert.equal(response.headers.get("content-type"), "image/png");
assert.equal(response.headers.get("x-content-type-options"), "nosniff");
assert.equal(response.headers.get("content-length"), String(bytes.length));
assert.match(response.headers.get("cache-control"), /public/);
assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
response = await request("id=123", "HEAD");
assert.equal(response.status, 200);
assert.equal(await response.text(), "");
const before = queries;
assert.equal((await request("id=1%20OR%201=1")).status, 400);
assert.equal((await request("")).status, 400);
assert.equal((await request("id=123", "POST")).status, 405);
assert.equal(queries, before);
for (stored of [null, "https://example.test/image.png", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,not-valid!"]) {
  assert.equal((await request()).status, 404);
}
fail = true;
response = await request();
assert.equal(response.status, 503);
assert.equal(await response.text(), "");
// Both production and development replace inline payloads before catalog transfer.
for (const file of ["api/catalog/products.mjs", "src/server/catalog.server.ts"]) {
  const catalog = readFileSync(file, "utf8");
  assert.match(catalog, /CASE WHEN LEFT\((?:pi\.)?image_url, 11\) = 'data:image\/'/);
  assert.match(catalog, /CONCAT\('\/api\/catalog\/product-image\?id=', (?:pi\.)?id\)/);
}
console.log("PASS: inline product images use separate public URLs; image bytes, HEAD, active-product checks, safe MIME types, bound IDs and private errors verified.");
