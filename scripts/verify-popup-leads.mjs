import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createAdminCookie } from "../api/_admin-session.mjs";

// Exercise the submission and production admin handlers against isolated storage.
process.env.ADMIN_SESSION_SECRET = "popup-leads-test-secret-at-least-32-characters";
for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]) process.env[key] = "test";
const leads = [];
let failInsert = false;
let reads = 0;
const pool = {
  async query(sql) {
    reads++;
    assert.match(sql, /FROM popup_leads WHERE deleted_at IS NULL/);
    return [structuredClone(leads.filter((lead) => !lead.deleted_at).toReversed())];
  },
  async execute(sql, params) {
    assert.match(sql, /INSERT INTO popup_leads \(name, mobile, email, interested_product_text, message, source\)/);
    if (failInsert) throw new Error("Simulated database write failure");
    const [name, mobile, email, interested_product_text, message, source] = params;
    leads.push({ name, mobile, email, interested_product_text, message, source,
      status: "NEW", submitted_at: new Date("2026-10-15T10:00:00Z"), deleted_at: null });
    return [{ insertId: leads.length, affectedRows: 1 }];
  },
};
globalThis.__popupLeadsTestPool = pool;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
let submissionSource = readFileSync(new URL("../src/server/popup-leads.server.ts", import.meta.url), "utf8")
  .replace('import { database } from "./database.server";', 'const database = () => { throw new Error("MySQL requests must not write SQLite"); };')
  .replace('"./mysql.server"', JSON.stringify(moduleUrl("export const executeSql = async (sql, params) => (await globalThis.__popupLeadsTestPool.execute(sql, params))[0];")));
submissionSource = ts.transpileModule(submissionSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { handlePopupLeadRequest } = await import(moduleUrl(submissionSource));
let adminSource = readFileSync(new URL("../api/admin/[module].mjs", import.meta.url), "utf8")
  .replace('import { createPool } from "mysql2/promise";', "const createPool = () => globalThis.__popupLeadsTestPool;");
for (const name of ["_admin-session", "_admin-orders", "_admin-errors", "_reviews", "_popup-leads"]) {
  adminSource = adminSource.replace(`"../${name}.mjs"`, JSON.stringify(new URL(`../api/${name}.mjs`, import.meta.url).href));
}
const { default: admin } = await import(moduleUrl(adminSource));
async function list(authenticated = true) {
  const req = { method: "GET", query: { module: "popup-leads" }, headers: { cookie: authenticated ? createAdminCookie().split(";")[0] : "" } };
  const res = { statusCode: 200, payload: undefined, setHeader() {},
    status(value) { this.statusCode = value; return this; }, json(value) { this.payload = value; } };
  await admin(req, res);
  return res;
}
const input = { name: "Test Visitor", mobile: "9876543210", email: "visitor@example.test",
  interestedIn: "Period Care Combos", message: "Please share pack options", source: "Website popup" };
function submit(body, raw = false) {
  return handlePopupLeadRequest(new Request("http://test/api/popup-leads", {
    method: "POST", headers: { "content-type": "application/json" }, body: raw ? body : JSON.stringify(body),
  }));
}
assert.equal((await list(false)).statusCode, 401);
assert.equal(reads, 0, "Lead data must require admin authentication");
assert.deepEqual((await list()).payload.rows, []);
let response = await submit(input);
assert.equal(response.status, 201);
assert.equal((await response.json()).ok, true);
let result = await list();
assert.equal(result.statusCode, 200);
assert.equal(result.payload.source, "mysql");
assert.deepEqual(result.payload.rows, [[input.name, input.mobile, input.email, input.interestedIn, input.message, "2026-10-15", "NEW"]]);
assert.equal(result.payload.metrics[0].value, "1");
assert.equal(result.payload.metrics[1].value, "1");
assert.equal(leads[0].source, "Website popup");
await submit({ name: "Another Visitor", mobile: "9123456780" });
assert.equal(leads[1].email, null);
assert.equal(leads[1].interested_product_text, "Sanitary Pads");
leads[0].deleted_at = new Date();
assert.equal((await list()).payload.rows.length, 1);
for (const invalid of [null, [], {}, { ...input, mobile: "invalid" }, { ...input, email: "invalid" }]) {
  assert.equal((await submit(invalid)).status, 400);
}
for (const mobile of ["999999999", "99999999999", "999999999999999", "+919876543210", "98765 43210", "98765abcde"]) {
  const invalidResponse = await submit({ ...input, mobile });
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json()).error, "Enter a valid 10-digit mobile number.");
}
assert.equal((await submit("{broken-json", true)).status, 400);
assert.equal(leads.length, 2, "Invalid requests must not persist leads");
failInsert = true;
response = await submit(input);
assert.equal(response.status, 500);
assert.equal((await response.json()).error, "Could not save lead.");
assert.equal(leads.length, 2, "Failed writes must not report success");
assert.equal((await handlePopupLeadRequest(new Request("http://test/api/popup-leads"))).status, 405);
delete globalThis.__popupLeadsTestPool;
console.log("PASS: popup persistence, authenticated admin listing, all enquiry fields, counts, validation, deleted filtering, and failure handling.");
