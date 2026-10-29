import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createAdminCookie } from "../api/_admin-session.mjs";

// Verify the actual signup and production admin handlers without a live database.
process.env.ADMIN_SESSION_SECRET = "newsletter-test-secret-at-least-32-characters";
for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"])
  process.env[key] = "test";
const subscribers = [];
let failWrite = false,
  reads = 0;
const pool = {
  async query(sql) {
    reads++;
    assert.match(sql, /FROM newsletter_subscribers ORDER BY updated_at DESC, id DESC/);
    return [structuredClone(subscribers.toReversed())];
  },
  async execute(sql, params) {
    assert.match(sql, /INSERT INTO newsletter_subscribers \(email, status\)/);
    assert.match(sql, /ON DUPLICATE KEY UPDATE status = 'ACTIVE', unsubscribed_at = NULL/);
    if (failWrite) throw new Error("Simulated newsletter write failure");
    const existing = subscribers.find((subscriber) => subscriber.email === params[0]);
    if (existing)
      Object.assign(existing, {
        status: "ACTIVE",
        unsubscribed_at: null,
        updated_at: new Date("2026-10-16T01:00:00Z"),
      });
    else
      subscribers.push({
        email: params[0],
        status: "ACTIVE",
        subscribed_at: new Date("2026-10-16T00:00:00Z"),
        updated_at: new Date("2026-10-16T00:00:00Z"),
      });
    return [{ affectedRows: 1 }];
  },
};
globalThis.__newsletterTestPool = pool;
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
let signupSource = readFileSync(
  new URL("../src/server/newsletter.server.ts", import.meta.url),
  "utf8",
)
  .replace(
    'import { database } from "./database.server";',
    'const database = () => { throw new Error("MySQL signups must not write SQLite"); };',
  )
  .replace(
    '"./mysql.server"',
    JSON.stringify(
      moduleUrl(
        "export const executeSql = async (sql, params) => (await globalThis.__newsletterTestPool.execute(sql, params))[0];",
      ),
    ),
  );
signupSource = ts.transpileModule(signupSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { handleNewsletterRequest } = await import(moduleUrl(signupSource));
let adminSource = readFileSync(
  new URL("../api/admin/[module].mjs", import.meta.url),
  "utf8",
).replace(
  'import { createPool } from "mysql2/promise";',
  "const createPool = () => globalThis.__newsletterTestPool;",
);
for (const name of [
  "_admin-session",
  "_admin-orders",
  "_admin-errors",
  "_reviews",
  "_popup-leads",
  "_blogs",
  "_newsletter",
]) {
  adminSource = adminSource.replace(
    `"../${name}.mjs"`,
    JSON.stringify(new URL(`../api/${name}.mjs`, import.meta.url).href),
  );
}
const { default: admin } = await import(moduleUrl(adminSource));
async function list(authenticated = true) {
  const req = {
    method: "GET",
    query: { module: "newsletter" },
    headers: { cookie: authenticated ? createAdminCookie().split(";")[0] : "" },
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
    },
  };
  await admin(req, res);
  return res;
}
function signup(input, raw = false) {
  return handleNewsletterRequest(
    new Request("http://test/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? input : JSON.stringify(input),
    }),
  );
}
assert.equal((await list(false)).statusCode, 401);
assert.equal(reads, 0, "Subscriber emails must require admin authentication");
assert.deepEqual((await list()).payload.rows, []);
assert.equal((await signup({ email: "  Subscriber@Example.TEST " })).status, 201);
let result = await list();
assert.equal(result.statusCode, 200);
assert.equal(result.payload.source, "mysql");
assert.deepEqual(result.payload.rows, [
  ["subscriber@example.test", "Website newsletter", "2026-10-16", "2026-10-16", "ACTIVE"],
]);
assert.equal(result.payload.metrics[0].value, "1");
assert.equal(result.payload.metrics[1].value, "1");
await signup({ email: "subscriber@example.test" });
assert.equal(subscribers.length, 1, "Repeated signup must not duplicate subscribers");
subscribers[0].status = "UNSUBSCRIBED";
subscribers[0].unsubscribed_at = new Date();
assert.equal((await list()).payload.metrics[2].value, "1");
await signup({ email: "subscriber@example.test" });
assert.equal(subscribers[0].status, "ACTIVE");
assert.equal(subscribers[0].unsubscribed_at, null);
assert.equal(subscribers[0].subscribed_at.toISOString(), "2026-10-16T00:00:00.000Z");
for (const invalid of [
  null,
  [],
  {},
  { email: 123 },
  { email: "invalid" },
  { email: "a b@example.test" },
  { email: `${"a".repeat(250)}@example.test` },
]) {
  assert.equal((await signup(invalid)).status, 400);
}
assert.equal((await signup("{broken-json", true)).status, 400);
assert.equal(
  (await handleNewsletterRequest(new Request("http://test/api/newsletter"))).status,
  405,
);
assert.equal(subscribers.length, 1);
failWrite = true;
const response = await signup({ email: "another@example.test" });
assert.equal(response.status, 500);
assert.equal((await response.json()).error, "Could not save newsletter signup.");
assert.equal(subscribers.length, 1, "Failed writes must not report a successful signup");
delete globalThis.__newsletterTestPool;
console.log(
  "PASS: newsletter MySQL persistence, authenticated admin listing, counts, normalization, duplicate prevention, re-subscription, validation, and failed writes.",
);
