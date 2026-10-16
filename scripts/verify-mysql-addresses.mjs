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
let orders = [], orderItems = [], wishlists = [], reviews = [];
let failOrderItem = false;
const issuedSessions = new Map();
let revokedSessions = new Set();
let catalogFeatures = ["Soft cover", "Comfortable fit"];
let schemaStatements = 0;
const catalog = [{ id: "10", slug: "test-pad", name: "Test pads", sku: "TEST", sizes: ["XL"],
  flow: ["Medium"], stock: 20, images: ["/test.png"], mrp: 120,
  packOptions: [{ label: "Pack of 8", price: 100, mrp: 120, stock: 20 }] }];
const owned = (id) => addresses.filter((a) => String(a.customer_id) === String(id) && !a.deleted_at);
const adapter = {
  async executeSql(sql, values = []) {
    if (sql.startsWith("ALTER TABLE products") || sql.startsWith("ALTER TABLE product_images")) {
      schemaStatements++;
      return { affectedRows: 0 };
    }
    if (sql.startsWith("INSERT INTO customer_sessions")) {
      issuedSessions.set(values[0], values[1]);
      return { affectedRows: 1 };
    }
    if (sql.startsWith("DELETE FROM customer_sessions WHERE token_hash")) {
      issuedSessions.delete(values[0]);
      return { affectedRows: 1 };
    }
    if (sql.startsWith("DELETE FROM customer_sessions WHERE expires_at") || sql.startsWith("UPDATE customers SET last_login_at")) return { affectedRows: 1 };
    if (sql.includes("auth_rate_limits")) return { affectedRows: 1 };
    if (sql.startsWith("INSERT IGNORE INTO customer_wishlists")) {
      if (!wishlists.some((w) => w.customer_id === values[0] && w.product_id === values[1]))
        wishlists.push({ customer_id: values[0], product_id: values[1] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("DELETE FROM customer_wishlists")) {
      wishlists = wishlists.filter((w) => w.customer_id !== values[0] || w.product_id !== values[1]);
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE customers SET name")) {
      const [name, phone, whatsapp_number, id] = values;
      Object.assign(users.find((u) => u.id === id), { name, phone, whatsapp_number });
      return { affectedRows: 1 };
    }
    throw new Error(`Unexpected executeSql: ${sql}`);
  },
  async queryRows(sql, values) {
    if (sql.includes("FROM product_images") && !sql.includes("FROM products p")) return [{ product_id: 10, image_url: "/test.png" }];
    if (sql.includes("FROM products p") && sql.includes("p.selling_price")) return catalog
      .filter((product) => !sql.includes("AND p.slug = ?") || product.slug === values?.[0])
      .map((product) => ({
      id: product.id, slug: product.slug, name: product.name, sku: product.sku,
      mrp: product.mrp, selling_price: product.packOptions[0].price, discount_percent: 0,
      pack_quantity: product.packOptions[0].label, flow_type: "Medium", stock: product.stock,
      image_urls: "/test.png", is_featured: 1,
      features: catalogFeatures, usage_instructions: ["Change regularly"],
      disposal_instructions: ["Do not flush"],
    }));
    if (sql.includes("FROM customers") && sql.includes("email = ? OR mobile = ?")) return users.filter((u) => u.email === values[0] || u.phone === values[1]);
    if (sql.includes("auth_rate_limits")) return [{ attempt_count: 1 }];
    if (sql.includes("FROM customer_wishlists")) return wishlists.filter((w) => w.customer_id === values[0]).map(() => ({ slug: "test-pad" }));
    if (sql.includes("FROM products WHERE slug")) return values[0] === "test-pad" ? [{ id: 10 }] : [];
    if (sql.includes("FROM orders WHERE customer_id")) return structuredClone(orders.filter((o) => o.customer_id === values[0]));
    if (sql.includes("FROM order_items i JOIN orders")) return structuredClone(orderItems.filter((i) => orders.some((o) => o.id === i.order_id && o.customer_id === values[0])));
    if (sql.includes("FROM reviews r JOIN products")) return structuredClone(reviews.filter((r) => r.customer_id === values[0]).map((r) => ({ ...r, slug: "test-pad" })));
    if (sql.includes("FROM coupons")) return values[0] === "SAVE10" ? [{ discount_type: "PERCENTAGE", discount_value: 10, minimum_order_amount: 0, maximum_discount_amount: null }] : [];
    if (sql.includes("JOIN customer_sessions")) {
      const { createHash } = await import("node:crypto");
      return users.filter((u) => !revokedSessions.has(u.id) && (issuedSessions.get(values[0]) === u.id || createHash("sha256").update(`session-${u.id}`).digest("hex") === values[0]));
    }
    if (sql.includes("FROM customer_addresses")) {
      return owned(values[0]).toSorted((a, b) => b.is_default - a.is_default || a.id - b.id);
    }
    throw new Error(`Unexpected query: ${sql}`);
  },
  async mysqlTransaction(work) {
    const snapshot = structuredClone({ addresses, orders, orderItems, reviews });
    try {
      return await work({
        async query(sql, values) {
          if (sql.includes("FROM orders WHERE order_number")) return [structuredClone(orders.filter((o) => o.order_number === values[0] && o.customer_id === values[1]))];
          if (sql.includes("FROM order_items WHERE order_id")) return [structuredClone(orderItems.filter((i) => i.order_id === values[0] && i.product_slug === values[1]))];
          if (sql.includes("FROM reviews WHERE customer_id")) return [structuredClone(reviews.filter((r) => r.customer_id === values[0] && r.order_id === values[1] && r.product_id === values[2]))];
          if (sql.includes("FROM customers")) return [[{ id: values[0] }]];
          if (sql.includes("FROM customer_addresses")) return [structuredClone(owned(values[0]))];
          throw new Error(`Unexpected transaction query: ${sql}`);
        },
        async execute(sql, values) {
          if (sql.startsWith("UPDATE customers SET password_hash")) {
            users.find((u) => u.id === values[1]).password_hash = values[0];
            return [{ affectedRows: 1 }];
          }
          if (sql.startsWith("DELETE FROM customer_sessions WHERE customer_id")) {
            revokedSessions.add(values[0]);
            return [{ affectedRows: 1 }];
          }
          if (sql.startsWith("INSERT INTO orders")) {
            const [order_number, customer_id, customer_name, customer_email, customer_mobile, shipping_name,
              shipping_mobile, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state,
              shipping_pincode, subtotal_amount, discount_amount, coupon_discount_amount, shipping_amount,
              tax_amount, grand_total, payment_method, customer_note] = values;
            const id = orders.length + 1;
            orders.push({ id, order_number, customer_id, customer_name, customer_email, customer_mobile,
              shipping_name, shipping_mobile, shipping_address_line1, shipping_address_line2, shipping_city,
              shipping_state, shipping_pincode, subtotal_amount, discount_amount, coupon_discount_amount,
              shipping_amount, tax_amount, grand_total, payment_method, customer_note, order_status: "NEW", created_at: new Date() });
            return [{ insertId: id }];
          }
          if (sql.startsWith("INSERT INTO order_items")) {
            if (failOrderItem) throw new Error("Simulated item save failure");
            const [order_id, product_id, product_name, product_slug, sku, variant_name, size, pack_quantity,
              product_image_url, quantity, unit_price, unit_mrp, line_total] = values;
            orderItems.push({ order_id, product_id, product_name, product_slug, sku, variant_name, size,
              pack_quantity, product_image_url, quantity, unit_price, unit_mrp, line_total });
            return [{ affectedRows: 1 }];
          }
          if (sql.startsWith("INSERT INTO order_status_history")) return [{ affectedRows: 1 }];
          if (sql.startsWith("UPDATE orders SET order_status")) {
            const row = orders.find((o) => o.id === values[1] && o.customer_id === values[2]);
            Object.assign(row, { order_status: "CANCELLED", customer_note: values[0], cancelled_at: new Date() });
            return [{ affectedRows: 1 }];
          }
          if (sql.startsWith("INSERT INTO reviews")) {
            const [customer_id, order_id, product_id, rating, review_text] = values;
            reviews.push({ id: reviews.length + 1, customer_id, order_id, product_id, rating, review_text,
              status: "PENDING", created_at: new Date() });
            return [{ affectedRows: 1 }];
          }
          if (sql.startsWith("UPDATE reviews")) {
            Object.assign(reviews.find((r) => r.id === values[2]), { rating: values[0], review_text: values[1], status: "PENDING", moderated_at: null });
            return [{ affectedRows: 1 }];
          }
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
      ({ addresses, orders, orderItems, reviews } = snapshot);
      throw error;
    }
  },
};
globalThis.__addressTestAdapter = adapter;
const mysqlModule = moduleUrl(`export const { queryRows, executeSql, mysqlTransaction } = globalThis.__addressTestAdapter;`);
const realCatalogModule = moduleUrl(transpile(readFileSync("src/server/catalog.server.ts", "utf8"))
  .replace(/(["'])\.\/mysql\.server\1/g, JSON.stringify(mysqlModule)));
const replacements = {
  "./mysql.server": mysqlModule,
  "./catalog.server": realCatalogModule,
  "./database.server": moduleUrl(`export function database() { throw new Error("Unexpected SQLite access"); } export const transaction = database;`),
  "../lib/catalog": moduleUrl(`export const getProduct = () => undefined;`),
  "../lib/pricing": moduleUrl(transpile(readFileSync("src/lib/pricing.ts", "utf8"))),
  "../lib/cart-selection": moduleUrl(transpile(readFileSync("src/lib/cart-selection.ts", "utf8"))),
  zod: import.meta.resolve("zod"),
};
const source = transpile(readFileSync("src/server/customer.server.ts", "utf8"))
  .replace(/(["'])(\.\/mysql\.server|\.\/catalog\.server|\.\/database\.server|\.\.\/lib\/catalog|\.\.\/lib\/pricing|\.\.\/lib\/cart-selection|zod)\1/g,
    (_, quote, specifier) => JSON.stringify(replacements[specifier]));
const { handleCustomerRequest, hashPassword, verifyPassword, mysqlCreateOrder, mysqlSessionUser, guardOrigin } = await import(moduleUrl(source));
const { loadCatalogProducts } = await import(realCatalogModule);
for (const [value, expected] of [
  [["Soft cover", "Comfortable fit"], ["Soft cover", "Comfortable fit"]],
  ['["Soft cover","Comfortable fit"]', ["Soft cover", "Comfortable fit"]],
  ["Soft cover\nComfortable fit", ["Soft cover", "Comfortable fit"]],
  [[], ["Connected from SheRise MySQL catalog"]],
  [null, ["Connected from SheRise MySQL catalog"]],
  [{ legacy: true }, ["Connected from SheRise MySQL catalog"]],
]) {
  catalogFeatures = value;
  const [product] = await loadCatalogProducts();
  assert.deepEqual(product.features, expected);
  assert.deepEqual(product.usageInstructions, ["Change regularly"]);
  assert.deepEqual(product.disposalInstructions, ["Do not flush"]);
}
catalogFeatures = ["Soft cover", "Comfortable fit"];
console.log("PASS: real catalog reader handles MySQL JSON arrays, JSON strings, legacy text and empty/malformed fields.");
const { handleCatalogRequest } = await import(realCatalogModule);
const beforeSingleRead = schemaStatements;
const selectedProduct = await handleCatalogRequest(new Request("https://example.test/api/catalog/products?slug=test-pad"));
assert.equal((await selectedProduct.json()).products[0].slug, "test-pad");
assert.equal(schemaStatements, beforeSingleRead, "Warm catalog reads do not repeat schema work");
assert.deepEqual((await (await handleCatalogRequest(new Request("https://example.test/api/catalog/products?slug=missing"))).json()).products, []);
Object.assign(process.env, {
  MYSQL_HOST: "isolated-test", MYSQL_USER: "test", MYSQL_PASSWORD: "isolated-test", MYSQL_DATABASE: "test", VERCEL: "1",
  NODE_ENV: "production", APP_ORIGIN: "https://example.test",
});
const productionDriver = moduleUrl(`export function createPool() { return {
  query: async (sql, params) => [await globalThis.__addressTestAdapter.queryRows(sql, params)],
  execute: async (sql, params) => [await globalThis.__addressTestAdapter.executeSql(sql, params)]
}; }`);
const productionCatalogSource = readFileSync("api/catalog/products.mjs", "utf8").replace('"mysql2/promise"', JSON.stringify(productionDriver));
const { default: productionCatalogHandler } = await import(moduleUrl(productionCatalogSource));
const productionCall = async (slug) => {
  const response = { statusCode: 0, body: null, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  await productionCatalogHandler({ url: `/api/catalog/products?slug=${encodeURIComponent(slug)}` }, response);
  return response;
};
assert.equal((await productionCall("test-pad")).body.products[0].slug, "test-pad");
const afterFirstProductionRead = schemaStatements;
assert.deepEqual((await productionCall("missing")).body.products, []);
assert.equal(schemaStatements, afterFirstProductionRead, "Production requests share schema initialization");
assert.equal((await productionCall("x".repeat(221))).statusCode, 400);
console.log("PASS: development and production catalog APIs filter by a bound product slug and reuse schema initialization.");
let defaultSession = "session-1";
const call = async (action, body, session = defaultSession) => {
  const request = new Request(`https://example.test/api/customer/${action}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin: "https://example.test", cookie: `sherise_session=${session}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  // The trusted online-order core is called by /api/payments/create-order.
  // The legacy public order-create endpoint must continue to reject online payments.
  let response;
  if (action === "payment-order") {
    try {
      guardOrigin(request);
      const user = await mysqlSessionUser(request);
      response = user ? await mysqlCreateOrder(user, body, "payment") : new Response(JSON.stringify({ error: "Sign in required." }), { status: 401 });
    } catch (error) { response = new Response(JSON.stringify({ error: error.message }), { status: error.name === "ZodError" ? 400 : error.status || 500 }); }
  } else response = await handleCustomerRequest(request, action);
  return { status: response.status, cookie: response.headers.get("set-cookie"), ...await response.json() };
};
users[0].password_hash = await hashPassword("ExistingPassword!2026");
const signedIn = await call("login", { identifier: users[0].email, password: "ExistingPassword!2026", remember: true });
assert.equal(signedIn.status, 200);
assert.match(signedIn.cookie, /HttpOnly/);
assert.match(signedIn.cookie, /Secure/);
defaultSession = signedIn.cookie.split(";")[0].slice("sherise_session=".length);
assert.equal((await call("session")).user.id, "1", "Session issued by login authenticates every subsequent action");
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
console.log("PASS: MySQL address create/edit/delete, refresh persistence, defaults, validation, authorization, isolation, limits and rollback.");

assert.equal((await call("profile", { name: "Updated Customer", phone: "9876543210", whatsappNumber: "9876543210" })).user.name, "Updated Customer");
assert.equal((await call("session")).user.name, "Updated Customer");
assert.deepEqual((await call("wishlist", { slug: "test-pad", saved: true })).wishlist, ["test-pad"]);
assert.deepEqual((await call("session")).wishlist, ["test-pad"]);
assert.deepEqual((await call("session", undefined, "session-2")).wishlist, []);
assert.deepEqual((await call("wishlist", { slug: "test-pad", saved: false })).wishlist, []);
const orderInput = { requestId: crypto.randomUUID(), address: { ...input, id: "123" },
  items: [{ slug: "test-pad", size: " xl ", flow: "MEDIUM", pack: " Pack   of 8 ", quantity: 2, price: 1, name: "Tampered" }],
  coupon: "SAVE10", donationAmount: 50, payment: "UPI" };
assert.equal((await call("order-create", orderInput)).status, 400, "Production online checkout cannot bypass payment APIs");
result = await call("payment-order", orderInput);
assert.equal(result.status, 201, JSON.stringify(result));
const order = result.order;
assert.equal(order.subtotal, 200, "Server catalog overrides tampered price");
assert.equal(order.discount, 20);
assert.equal(order.donationAmount, 50);
assert.equal(order.total, 270);
assert.equal(order.items[0].name, "Test pads");
assert.equal(order.items[0].size, "XL");
assert.equal(order.items[0].flow, "Medium");
assert.equal(order.items[0].pack, "Pack of 8", "Formatting differences use canonical catalog options");
assert.equal((await call("payment-order", { ...orderInput, requestId: crypto.randomUUID(), items: [{ ...orderInput.items[0], pack: "Old discontinued pack" }] })).status, 400, "Different packs are never silently substituted");
assert.equal((await call("session")).orders[0].id, order.id);
assert.equal((await call("payment-order", orderInput)).order.id, order.id, "Retry does not duplicate order");
assert.equal((await call("payment-order", { ...orderInput, donationAmount: 20 })).status, 409, "A changed checkout cannot reuse an old payment order");
assert.equal(orders.length, 1);
assert.deepEqual((await call("session", undefined, "session-2")).orders, []);
assert.equal((await call("order-cancel", { id: order.id }, "session-2")).status, 404);
assert.equal((await call("order-review", { id: order.id, slug: "test-pad", rating: 5, reviewText: "Very comfortable" }, "session-2")).status, 404);
assert.equal((await call("payment-order", { ...orderInput, requestId: crypto.randomUUID(), donationAmount: -10 })).status, 400);
assert.equal((await call("payment-order", { ...orderInput, requestId: crypto.randomUUID(), coupon: "EXPIRED" })).status, 400);
assert.equal((await call("payment-order", { ...orderInput, requestId: crypto.randomUUID(), items: [{ ...orderInput.items[0], quantity: 21 }] })).status, 409);
assert.equal((await call("payment-order", { ...orderInput, requestId: crypto.randomUUID(), items: [{ ...orderInput.items[0], slug: "fake-product" }] })).status, 400);
assert.equal((await call("order-create", { ...orderInput, requestId: crypto.randomUUID(), payment: "Cash on Delivery" })).status, 400);
const largeOrder = { ...orderInput, requestId: crypto.randomUUID(), coupon: "", donationAmount: 100,
  items: [{ ...orderInput.items[0], quantity: 9 }] };
assert.equal((await call("payment-order", largeOrder)).status, 400, "Donation counts toward COD threshold");
assert.equal((await call("order-create", { ...largeOrder, payment: "Cash on Delivery" })).status, 201);
assert.equal((await call("order-create", orderInput, "expired")).status, 401);
failOrderItem = true;
try {
  console.error = () => {};
  assert.equal((await call("payment-order", { ...orderInput, requestId: crypto.randomUUID() })).status, 500);
} finally { console.error = originalError; failOrderItem = false; }
assert.equal(orders.length, 2, "Failed item save rolls back the entire order");
result = await call("order-cancel", { id: order.id, reason: "Ordered by mistake" });
assert.equal(result.orders[0].status, "cancelled");
assert.equal(result.orders[0].donationAmount, 50);
assert.equal(result.orders[0].cancellationReason, "Ordered by mistake");
orders[1].order_status = "DELIVERED";
const deliveredId = orders[1].order_number;
assert.equal((await call("order-cancel", { id: deliveredId })).status, 409);
const reviewInput = { id: deliveredId, slug: "test-pad", rating: 5, reviewText: "Comfortable pads, good fit." };
result = await call("order-review", reviewInput);
assert.equal(result.status, 200);
assert.equal(result.orders[1].reviews[0].status, "PENDING");
await call("order-review", { ...reviewInput, rating: 4 });
assert.equal(reviews.length, 1);
assert.equal(reviews[0].rating, 4);
assert.equal((await call("order-review", { ...reviewInput, id: order.id })).status, 409);
console.log("PASS: shared MySQL session, profile/wishlist persistence, checkout, trusted prices, coupon/donation/COD totals, retries, order isolation, cancellation, reviews and rollback.");
assert.equal((await call("password", { currentPassword: "Incorrect", password: "UpdatedPassword!2026" })).status, 400);
const changed = await call("password", { currentPassword: "ExistingPassword!2026", password: "UpdatedPassword!2026" });
assert.equal(changed.status, 200);
assert.match(changed.cookie, /Max-Age=0/);
assert.equal(await verifyPassword("UpdatedPassword!2026", users[0].password_hash), true);
assert.equal((await call("session")).user, null, "Changing password revokes sessions");
assert.equal((await call("order-create", orderInput)).status, 401);
assert.equal((await call("logout", {})).status, 200);
console.log("PASS: login cookie, password verification/change, session revocation and logout.");
delete globalThis.__addressTestAdapter;
