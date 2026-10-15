import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Exercise the actual request handler with an isolated MySQL adapter, never a live database.
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const users = [1, 2].map((id) => ({
  id, name: `Customer ${id}`, email: `${id}@example.test`, phone: "9876543210",
  whatsapp_number: "9876543210", created_at: new Date(),
}));
let addresses = [];
let nextId = 1;
let failInsert = false;
const owned = (id) => addresses.filter((a) => String(a.customer_id) === String(id) && !a.deleted_at);
const adapter = {
  async queryRows(sql, values) {
    if (sql.includes("JOIN customer_sessions")) {
      const { createHash } = await import("node:crypto");
      return users.filter((u) => createHash("sha256").update(`session-${u.id}`).digest("hex") === values[0]);
    }
    if (sql.includes("FROM customer_addresses")) {
      return owned(values[0]).toSorted((a, b) => b.is_default - a.is_default || a.id - b.id);
    }
    throw new Error(`Unexpected query: ${sql}`);
  },
  async mysqlTransaction(work) {
    const snapshot = structuredClone(addresses);
    try {
      return await work({
        async query(sql, values) {
          if (sql.includes("FROM customers")) return [[{ id: values[0] }]];
          if (sql.includes("FROM customer_addresses")) return [structuredClone(owned(values[0]))];
          throw new Error(`Unexpected transaction query: ${sql}`);
        },
        async execute(sql, values) {
          if (sql.startsWith("INSERT")) {
            if (failInsert) throw new Error("Simulated insert failure");
            const [label, recipient_name, mobile, address_line1, address_line2, city, state, pincode, is_default, customer_id] = values;
            addresses.push({ id: nextId++, label, recipient_name, mobile, address_line1, address_line2, city, state, pincode, is_default, customer_id });
          } else if (sql.includes("SET label")) {
            const [label, recipient_name, mobile, address_line1, address_line2, city, state, pincode, is_default, id, customer] = values;
            const row = owned(customer).find((a) => String(a.id) === id);
            Object.assign(row, { label, recipient_name, mobile, address_line1, address_line2, city, state, pincode, is_default });
          } else if (sql.includes("SET deleted_at")) {
            const row = owned(values[1]).find((a) => String(a.id) === values[0]);
            Object.assign(row, { deleted_at: new Date(), is_default: 0 });
          } else if (sql.includes("SET is_default = 0")) {
            owned(values[0]).forEach((a) => { a.is_default = 0; });
          } else if (sql.includes("SET is_default = 1")) {
            owned(values[1]).find((a) => String(a.id) === String(values[0])).is_default = 1;
          } else throw new Error(`Unexpected mutation: ${sql}`);
          return [{ affectedRows: 1 }];
        },
      });
    } catch (error) {
      addresses = snapshot;
      throw error;
    }
  },
};
globalThis.__addressTestAdapter = adapter;
const replacements = {
  "./mysql.server": moduleUrl(`export const { queryRows, mysqlTransaction } = globalThis.__addressTestAdapter;`),
  "./database.server": moduleUrl(`export function database() { throw new Error("Unexpected SQLite access"); } export const transaction = database;`),
  "../lib/catalog": moduleUrl(`export const getProduct = () => undefined;`),
  "../lib/pricing": moduleUrl(transpile(readFileSync("src/lib/pricing.ts", "utf8"))),
  zod: import.meta.resolve("zod"),
};
const source = transpile(readFileSync("src/server/customer.server.ts", "utf8"))
  .replace(/(["'])(\.\/mysql\.server|\.\/database\.server|\.\.\/lib\/catalog|\.\.\/lib\/pricing|zod)\1/g,
    (_, quote, specifier) => JSON.stringify(replacements[specifier]));
const { handleCustomerRequest } = await import(moduleUrl(source));
Object.assign(process.env, {
  MYSQL_HOST: "isolated-test", MYSQL_USER: "test", MYSQL_DATABASE: "test", VERCEL: "1",
  NODE_ENV: "production", APP_ORIGIN: "https://example.test",
});
const call = async (action, body, session = "session-1") => {
  const response = await handleCustomerRequest(new Request(`https://example.test/api/customer/${action}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin: "https://example.test", cookie: `sherise_session=${session}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), action);
  return { status: response.status, ...await response.json() };
};
const input = { name: "Test Customer", phone: "9876543210", line1: "12 Test Street", line2: "",
  city: "Pune", state: "Maharashtra", pin: "411001", label: "Home", isDefault: false };
assert.equal((await call("address-save", input, "missing")).status, 401);
assert.equal((await call("address-save", { ...input, pin: "bad" })).status, 400);
let result = await call("address-save", input);
assert.equal(result.status, 200);
assert.equal(result.addresses.length, 1);
const first = result.addresses[0];
assert.equal(first.id, "1");
assert.equal(first.isDefault, true);
assert.equal(first.label, "Home");
assert.deepEqual((await call("session")).addresses, [first], "Refresh retains saved addresses");
assert.equal((await call("address-save", { ...first, city: "Mumbai", label: "Work" })).addresses[0].city, "Mumbai");
assert.equal((await call("address-save", { ...first, label: "Work" })).addresses[0].label, "Work");
assert.equal((await call("address-save", { ...first, city: "Stolen" }, "session-2")).status, 404);
assert.equal((await call("address-delete", { id: first.id }, "session-2")).status, 404);
assert.deepEqual((await call("session", undefined, "session-2")).addresses, []);
result = await call("address-save", { ...input, label: "Other", isDefault: true });
assert.equal(result.addresses.filter((a) => a.isDefault).length, 1);
assert.equal(result.addresses[0].label, "Other");
const second = result.addresses[0];
await call("address-delete", { id: second.id });
result = await call("session");
assert.equal(result.addresses.length, 1);
assert.equal(result.addresses[0].id, first.id);
assert.equal(result.addresses[0].isDefault, true, "Deleting default promotes remaining address");
assert.equal((await call("address-save", second)).status, 404, "Deleted addresses cannot be revived");
failInsert = true;
const originalError = console.error;
try {
  console.error = () => {};
  assert.equal((await call("address-save", { ...input, isDefault: true })).status, 500);
} finally { console.error = originalError; failInsert = false; }
assert.equal((await call("session")).addresses[0].isDefault, true, "Failed save preserves default");
for (let i = 1; i < 10; i++) assert.equal((await call("address-save", input)).status, 200);
assert.equal((await call("address-save", input)).status, 400, "Limit is enforced");
assert.equal((await call("address-save", { ...first, city: "Mumbai" })).status, 200, "Editing is allowed at the limit");
for (const address of (await call("session")).addresses) {
  assert.equal((await call("address-delete", { id: address.id })).status, 200);
}
assert.deepEqual((await call("session")).addresses, []);
delete globalThis.__addressTestAdapter;
console.log("PASS: MySQL address create/edit/delete, refresh persistence, defaults, validation, authorization, isolation, limits and rollback.");
