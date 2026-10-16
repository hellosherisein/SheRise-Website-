import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createAdminCookie } from "../api/_admin-session.mjs";

process.env.ADMIN_SESSION_SECRET = "blog-image-test-admin-secret-32-characters";
process.env.APP_ORIGIN = "https://example.test";
const image = readFileSync("src/assets/sherise-flatlay.jpg");
const media = new Map(), published = new Set();
let missing = true, migrations = 0, fail = false;
globalThis.__blogImageQuery = async (sql, params = []) => {
  if (sql === "SELECT id FROM blog_media LIMIT 0") {
    if (missing) throw Object.assign(new Error("Missing"), { code: "ER_NO_SUCH_TABLE" });
    return [];
  }
  assert.match(sql, /m.id = \?/);
  if (sql.includes("AND EXISTS")) {
    assert.match(sql, /b.deleted_at IS NULL/);
    assert.match(sql, /b.status = 'PUBLISHED'/);
    assert.match(sql, /b.published_at <= NOW\(\)/);
    if (!published.has(params[1])) return [];
  }
  return media.has(params[0]) ? [media.get(params[0])] : [];
};
globalThis.__blogImageWrite = async (sql, params) => {
  if (sql.startsWith("CREATE TABLE")) { missing = false; migrations++; return {}; }
  if (fail) throw new Error("Private database details");
  assert.match(sql, /^INSERT INTO blog_media/);
  media.set(params[0], { mime_type: params[1], image_data: params[2] });
  return { affectedRows: 1 };
};
let source = readFileSync("src/server/blog-images.server.ts", "utf8")
  .replace('import { queryRows, executeSql } from "./mysql.server";', "const queryRows = (...args) => globalThis.__blogImageQuery(...args); const executeSql = (...args) => globalThis.__blogImageWrite(...args);")
  .replace('"../../api/_admin-session.mjs"', JSON.stringify(new URL("../api/_admin-session.mjs", import.meta.url).href));
source = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { handleBlogImageUpload, handleBlogImageRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const cookie = createAdminCookie().split(";")[0];
const upload = (file = new File([image], "photo.jpg", { type: "image/jpeg" }), authenticated = true, origin = process.env.APP_ORIGIN) => {
  const form = new FormData(); form.append("images", file);
  return handleBlogImageUpload(new Request("https://example.test/api/admin/upload-blog-image", { method: "POST", headers: { cookie: authenticated ? cookie : "", origin }, body: form }));
};
assert.equal((await upload(undefined, false)).status, 401);
assert.equal((await upload(undefined, true, "https://other.test")).status, 403);
assert.equal(media.size, 0);
assert.equal((await upload(new File(["bad"], "bad.jpg", { type: "image/jpeg" }))).status, 400);
assert.equal((await upload(new File(["<svg/>"], "bad.svg", { type: "image/svg+xml" }))).status, 400);
assert.equal((await upload(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" }))).status, 413);
let response = await upload();
assert.equal(response.status, 200);
const url = (await response.json()).urls[0];
assert.match(url, /^\/api\/content\/blog-image\?id=/);
assert.equal(migrations, 1);
const get = (authenticated = false, method = "GET") => handleBlogImageRequest(new Request(`https://example.test${url}`, { method, headers: { cookie: authenticated ? cookie : "" } }));
assert.equal((await get()).status, 404, "Unpublished images stay private");
assert.equal((await get(true)).status, 200, "Admin can preview before saving");
published.add(url);
response = await get();
assert.equal(response.status, 200);
assert.equal(response.headers.get("content-type"), "image/jpeg");
assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
assert.equal(await (await get(false, "HEAD")).text(), "");
published.delete(url);
assert.equal((await get()).status, 404, "Unpublishing hides the image");
fail = true;
response = await upload();
assert.equal(response.status, 503);
assert.ok(!(await response.text()).includes("Private database"));
console.log("PASS: durable blog image uploads, admin/origin guards, size/MIME validation, draft previews and published image access.");
