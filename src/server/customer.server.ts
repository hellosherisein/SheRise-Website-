import { scrypt, randomBytes, createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { database, transaction } from "./database.server";
import { getProduct } from "../lib/catalog";
import { calculateOrderTotals, type CouponDiscount } from "../lib/pricing";
import { resolveCartSelection } from "../lib/cart-selection";
import type { Address, Customer, CustomerOrder, OrderItem } from "../lib/customer-types";
const cookieName = "sherise_session";
const COD_MINIMUM_TOTAL = 1000;
const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use at most 128 characters.");
const name = z.string().trim().min(2).max(80);
const phone = z.string().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit mobile number.");
const optionalPhone = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || /^[6-9][0-9]{9}$/.test(value), {
    message: "Enter a valid 10-digit mobile number.",
  })
  .default("");
const whatsappNumber = z
  .string()
  .trim()
  .regex(/^[6-9][0-9]{9}$/, {
    message: "Enter a valid 10-digit WhatsApp number.",
  });
const email = z.string().trim().toLowerCase().email().max(254);
const addressSchema = z.object({
  id: z.string().uuid().optional(),
  name,
  phone,
  line1: z.string().trim().min(5).max(200),
  line2: z.string().trim().max(100).default(""),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pin: z.string().regex(/^[1-9][0-9]{5}$/),
  label: z.enum(["Home", "Work", "Other"]),
  isDefault: z.boolean(),
});
type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp_number: string;
  password_hash: string;
  created_at: string;
};
type MysqlCustomerRow = {
  id: number | string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp_number: string;
  password_hash: string;
  created_at: string | Date;
};
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const derive = (text: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(text, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, key) =>
      e ? reject(e) : resolve(key),
    ),
  );
export async function hashPassword(text: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(text, salt)).toString("hex")}`;
}
export async function verifyPassword(text: string, stored: string) {
  const [, salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const actual = await derive(text, salt);
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const publicUser = (r: Row): Customer => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone || "",
  whatsappNumber: r.whatsapp_number,
  createdAt: r.created_at,
});
function token(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) || ""
  );
}
function sessionUser(request: Request) {
  const r = database()
    .prepare(
      "SELECT c.* FROM customers c JOIN sessions s ON s.user_id=c.id WHERE s.token_hash=? AND s.expires_at>?",
    )
    .get(hash(token(request)), Date.now()) as Row | undefined;
  return r;
}
function requireUser(request: Request) {
  const r = sessionUser(request);
  if (!r) throw new ApiError(401, "Please sign in to continue.");
  return r;
}
function setCookie(value: string, seconds: number, request: Request) {
  const secure =
    process.env["NODE_ENV"] === "production" || new URL(request.url).protocol === "https:";
  return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? "; Secure" : ""}`;
}
function newSession(userId: string, remember: boolean, request: Request) {
  const t = randomBytes(32).toString("hex");
  const seconds = (remember ? 30 : 1) * 86400;
  database()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(hash(t), userId, Date.now() + seconds * 1000);
  database().prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
  return setCookie(t, seconds, request);
}
function json(body: unknown, status = 200, cookie?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}
function hasMysqlCustomerStore() {
  return Boolean(process.env["MYSQL_HOST"] && process.env["MYSQL_USER"] && process.env["MYSQL_DATABASE"]);
}
async function mysqlCustomerData(user: MysqlCustomerRow) {
  const { queryRows } = await import("./mysql.server");
  const addresses = await queryRows<any>(
    `SELECT id, recipient_name, mobile, address_line1, address_line2, city, state, pincode, label, is_default
     FROM customer_addresses WHERE customer_id = ? AND deleted_at IS NULL
     ORDER BY is_default DESC, id ASC`,
    [user.id],
  );
  const wishlist = await queryRows<any>(
    `SELECT p.slug FROM customer_wishlists w JOIN products p ON p.id = w.product_id
     WHERE w.customer_id = ? AND p.deleted_at IS NULL`, [user.id],
  );
  return {
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      whatsappNumber: user.whatsapp_number,
      createdAt:
        user.created_at instanceof Date ? user.created_at.toISOString() : String(user.created_at),
    },
    addresses: addresses.map((address): Address => ({
      id: String(address.id),
      name: address.recipient_name,
      phone: address.mobile,
      line1: address.address_line1,
      line2: address.address_line2 || "",
      city: address.city,
      state: address.state,
      pin: address.pincode,
      label: address.label === "WORK" ? "Work" : address.label === "OTHER" ? "Other" : "Home",
      isDefault: Boolean(Number(address.is_default)),
    })),
    wishlist: wishlist.map((item) => item.slug as string),
    orders: await mysqlOrders(user.id),
  };
}

function isoDate(value: string | Date) {
  return value instanceof Date ? value.toISOString() : String(value);
}

async function mysqlOrders(customerId: string | number): Promise<CustomerOrder[]> {
  const { queryRows } = await import("./mysql.server");
  const orders = await queryRows<any>(
    "SELECT * FROM orders WHERE customer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, id DESC",
    [customerId],
  );
  if (!orders.length) return [];
  const items = await queryRows<any>(
    `SELECT i.* FROM order_items i JOIN orders o ON o.id = i.order_id
     WHERE o.customer_id = ? AND o.deleted_at IS NULL`, [customerId],
  );
  const reviews = await queryRows<any>(
    `SELECT r.*, p.slug FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE r.customer_id = ? AND r.deleted_at IS NULL`, [customerId],
  );
  return orders.map((order): CustomerOrder => {
    let metadata: { donationAmount?: number; cancellationReason?: string } = {};
    try { metadata = JSON.parse(order.customer_note || "{}"); } catch { /* Older orders contain plain notes. */ }
    const statuses: Record<string, CustomerOrder["status"]> = {
      PACKED: "packed", SHIPPED: "shipped", OUT_FOR_DELIVERY: "shipped", DELIVERED: "delivered",
      CANCELLED: "cancelled", RETURNED: "cancelled", REFUNDED: "cancelled",
    };
    const payments: Record<string, string> = { CARD: "Cards", NET_BANKING: "Net Banking", WALLET: "Wallet", COD: "Cash on Delivery" };
    return {
      id: order.order_number, createdAt: isoDate(order.created_at),
      address: { id: String(order.id), name: order.shipping_name, phone: order.shipping_mobile,
        line1: order.shipping_address_line1, line2: order.shipping_address_line2 || "", city: order.shipping_city,
        state: order.shipping_state, pin: order.shipping_pincode, label: "Home", isDefault: false },
      items: items.filter((item) => String(item.order_id) === String(order.id)).map((item) => ({
        slug: item.product_slug || "", name: item.product_name, image: item.product_image_url || "",
        size: item.size || "", pack: item.pack_quantity || "", flow: item.variant_name || "",
        quantity: Number(item.quantity), price: Number(item.unit_price),
      })),
      subtotal: Number(order.subtotal_amount), discount: Number(order.discount_amount),
      shippingAmount: Number(order.shipping_amount), gstAmount: Number(order.tax_amount),
      donationAmount: Number(metadata?.donationAmount || 0), total: Number(order.grand_total),
      payment: payments[order.payment_method] || order.payment_method,
      status: statuses[order.order_status] || "preview",
      ...(metadata?.cancellationReason ? { cancellationReason: metadata.cancellationReason } : {}),
      ...(order.cancelled_at ? { cancelledAt: isoDate(order.cancelled_at) } : {}),
      reviews: reviews.filter((review) => String(review.order_id) === String(order.id)).map((review) => ({
        slug: review.slug, rating: Number(review.rating), reviewText: review.review_text,
        reviewedAt: isoDate(review.updated_at || review.created_at), status: review.status,
        ...(review.moderated_at ? { moderatedAt: isoDate(review.moderated_at) } : {}),
      })),
    };
  });
}

async function mysqlCreateOrder(user: MysqlCustomerRow, input: unknown) {
  const data = z.object({
    requestId: z.string().uuid(),
    address: addressSchema.extend({ id: z.string().max(64).optional() }),
    items: z.array(z.object({
      slug: z.string().max(220), size: z.string().max(50), flow: z.string().max(150),
      pack: z.string().max(80), quantity: z.number().int().min(1).max(99),
    })).min(1).max(50),
    coupon: z.string().trim().max(50).default(""),
    donationAmount: z.union([z.literal(0), z.literal(10), z.literal(20), z.literal(50), z.literal(80), z.literal(100)]).default(0),
    payment: z.enum(["UPI", "Cards", "Net Banking", "Wallet", "Cash on Delivery"]),
  }).parse(input);
  const { mysqlTransaction } = await import("./mysql.server");
  const { loadCatalogProducts } = await import("./catalog.server");
  // A deterministic, customer-specific number makes retries safe without a schema migration.
  const orderNumber = "SR-" + hash(`${user.id}:${data.requestId}`).slice(0, 32).toUpperCase();
  const catalog = await loadCatalogProducts();
  const created = await mysqlTransaction(async (connection) => {
    await connection.query("SELECT id FROM customers WHERE id = ? FOR UPDATE", [user.id]);
    const [existing] = await connection.query<any[]>(
      "SELECT id FROM orders WHERE order_number = ? AND customer_id = ?", [orderNumber, user.id],
    );
    if (existing.length) return false;
    const quantities = new Map<string, number>();
    const items = data.items.map((item) => {
      const product = catalog.find((product) => product.slug === item.slug);
      const selection = resolveCartSelection({ ...item, price: 0 }, product);
      if (!product || !selection.optionsMatch)
        throw new ApiError(400, `${product?.name || item.slug}: ${selection.issues.join(". ")}. Please review the options in your bag.`);
      const quantity = (quantities.get(item.slug) || 0) + item.quantity;
      quantities.set(item.slug, quantity);
      if (quantity > product.stock) throw new ApiError(409, `${product.name} does not have enough stock.`);
      return { ...selection.item, product, name: product.name };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const couponDiscount = await activeCouponDiscount(data.coupon, subtotal);
    if (data.coupon && !couponDiscount) throw new ApiError(400, "This coupon is no longer eligible. Remove it or apply another code.");
    const totals = calculateOrderTotals(subtotal, couponDiscount, data.donationAmount);
    if (totals.total >= COD_MINIMUM_TOTAL && data.payment !== "Cash on Delivery")
      throw new ApiError(400, "Orders of ₹1,000 and above are Cash on Delivery only.");
    if (totals.total < COD_MINIMUM_TOTAL && data.payment === "Cash on Delivery")
      throw new ApiError(400, "Cash on Delivery is available only on orders of ₹1,000 and above.");
    const payment = { UPI: "UPI", Cards: "CARD", "Net Banking": "NET_BANKING", Wallet: "WALLET", "Cash on Delivery": "COD" }[data.payment];
    const a = data.address;
    const [result] = await connection.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO orders (order_number, customer_id, customer_name, customer_email, customer_mobile,
       shipping_name, shipping_mobile, shipping_address_line1, shipping_address_line2, shipping_city,
       shipping_state, shipping_pincode, subtotal_amount, discount_amount, coupon_discount_amount,
       shipping_amount, tax_amount, grand_total, payment_method, customer_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderNumber, user.id, user.name, user.email, user.phone || a.phone, a.name, a.phone, a.line1, a.line2,
        a.city, a.state, a.pin, totals.subtotal, totals.discountAmount, totals.discountAmount,
        totals.shippingAmount, totals.gstAmount, totals.total, payment,
        JSON.stringify({ requestId: data.requestId, donationAmount: data.donationAmount, coupon: data.coupon, preview: true })],
    );
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, product_slug, sku, variant_name,
         size, pack_quantity, product_image_url, quantity, unit_price, unit_mrp, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, item.product.id, item.name, item.slug, item.product.sku, item.flow, item.size,
          item.pack, item.product.images.find((image) => image.length <= 500) || "", item.quantity, item.price, item.product.mrp, item.quantity * item.price],
      );
    }
    await connection.execute(
      "INSERT INTO order_status_history (order_id, new_status, note) VALUES (?, 'NEW', ?)",
      [result.insertId, "Preview order saved by customer. No payment or shipment processed."],
    );
    return true;
  });
  const order = (await mysqlOrders(user.id)).find((order) => order.id === orderNumber);
  if (!order) throw new ApiError(500, "Could not load your order. Please retry.");
  return json({ order }, created ? 201 : 200);
}
async function mysqlSessionUser(request: Request) {
  const { queryRows } = await import("./mysql.server");
  const rows = await queryRows<any>(
    `SELECT c.id, c.name, c.email, c.mobile AS phone, c.whatsapp_number, c.password_hash, c.created_at
     FROM customers c
     JOIN customer_sessions s ON s.customer_id = c.id
     WHERE s.token_hash = ?
       AND s.expires_at > NOW()
       AND c.deleted_at IS NULL
       AND c.status = 'ACTIVE'
     LIMIT 1`,
    [hash(token(request))],
  );
  return rows[0] as MysqlCustomerRow | undefined;
}
async function mysqlNewSession(userId: string | number, remember: boolean, request: Request) {
  const { executeSql } = await import("./mysql.server");
  const t = randomBytes(32).toString("hex");
  const seconds = (remember ? 30 : 1) * 86400;
  await executeSql("INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?, ?, ?)", [
    hash(t),
    userId,
    mysqlDateTime(new Date(Date.now() + seconds * 1000)),
  ]);
  await executeSql("DELETE FROM customer_sessions WHERE expires_at <= NOW()");
  return setCookie(t, seconds, request);
}
async function handleMysqlCustomerRequest(request: Request, action: string) {
  const { queryRows, executeSql } = await import("./mysql.server");
  if (request.method === "GET") {
    if (action !== "session") throw new ApiError(404, "Not found.");
    const user = await mysqlSessionUser(request);
    return json(user ? await mysqlCustomerData(user) : { user: null, addresses: [], wishlist: [], orders: [] });
  }
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  guardOrigin(request);
  const input = await readBody(request);
  if (["register", "login", "forgot-password", "reset-password"].includes(action)) await mysqlLimit("global-auth", 200);

  if (action === "register") {
    const data = z
      .object({ name, email, phone: optionalPhone, whatsappNumber, password, remember: z.boolean().default(false) })
      .parse(input);
    await mysqlLimit("register:" + data.email, 5);
    const passwordHash = await hashPassword(data.password);
    try {
      const result = await executeSql(
        `INSERT INTO customers (name, email, mobile, whatsapp_number, password_hash, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
        [data.name, data.email, data.phone, data.whatsappNumber, passwordHash],
      );
      const rows = await queryRows<any>(
        "SELECT id, name, email, mobile AS phone, whatsapp_number, password_hash, created_at FROM customers WHERE id = ?",
        [result.insertId],
      );
      const user = rows[0] as MysqlCustomerRow;
      return json(await mysqlCustomerData(user), 201, await mysqlNewSession(user.id, data.remember, request));
    } catch (error) {
      if (String(error).includes("Duplicate") || String(error).includes("uq_customers"))
        throw new ApiError(
          409,
          "An account with these details already exists. Please sign in or reset your password.",
        );
      throw error;
    }
  }

  if (action === "login") {
    const data = z
      .object({
        identifier: z.string().trim().toLowerCase().min(3).max(254),
        password: z.string().max(128),
        remember: z.boolean().default(false),
      })
      .parse(input);
    await mysqlLimit("login:" + data.identifier, 10);
    const rows = await queryRows<any>(
      `SELECT id, name, email, mobile AS phone, whatsapp_number, password_hash, created_at
       FROM customers
       WHERE deleted_at IS NULL
         AND status = 'ACTIVE'
         AND (email = ? OR mobile = ?)
       LIMIT 1`,
      [data.identifier, data.identifier],
    );
    const user = rows[0] as MysqlCustomerRow | undefined;
    const valid = await verifyPassword(
      data.password,
      user?.password_hash || "scrypt:00000000000000000000000000000000:" + "00".repeat(64),
    );
    if (!user || !valid) throw new ApiError(401, "Email/mobile number or password is incorrect.");
    await executeSql("DELETE FROM customer_sessions WHERE token_hash = ?", [hash(token(request))]);
    await executeSql("UPDATE customers SET last_login_at = NOW() WHERE id = ?", [user.id]);
    return json(await mysqlCustomerData(user), 200, await mysqlNewSession(user.id, data.remember, request));
  }

  if (action === "logout") {
    await executeSql("DELETE FROM customer_sessions WHERE token_hash = ?", [hash(token(request))]);
    return json({ ok: true }, 200, setCookie("", 0, request));
  }

  if (action === "forgot-password" || action === "reset-password") {
    throw new ApiError(503, "Password reset for this account is not configured yet. Please contact support.");
  }

  // Every authenticated action must use the same session store as login.
  const user = await mysqlSessionUser(request);
  if (!user) throw new ApiError(401, "Your session has expired. Please sign in again.");
  await mysqlLimit("customer-write:" + user.id, 120);

  if (action === "profile") {
    const data = z.object({ name, phone: optionalPhone, whatsappNumber }).parse(input);
    try {
      await executeSql("UPDATE customers SET name = ?, mobile = ?, whatsapp_number = ? WHERE id = ?",
        [data.name, data.phone, data.whatsappNumber, user.id]);
    } catch (error) {
      if (String(error).includes("Duplicate")) throw new ApiError(409, "That mobile number is already registered.");
      throw error;
    }
    return json(await mysqlCustomerData({ ...user, name: data.name, phone: data.phone, whatsapp_number: data.whatsappNumber }));
  }

  if (action === "password") {
    const data = z.object({ currentPassword: z.string().max(128), password }).parse(input);
    await mysqlLimit("password:" + user.id, 5);
    if (!(await verifyPassword(data.currentPassword, user.password_hash))) throw new ApiError(400, "Current password is incorrect.");
    const newHash = await hashPassword(data.password);
    const { mysqlTransaction } = await import("./mysql.server");
    await mysqlTransaction(async (connection) => {
      await connection.execute("UPDATE customers SET password_hash = ? WHERE id = ?", [newHash, user.id]);
      await connection.execute("DELETE FROM customer_sessions WHERE customer_id = ?", [user.id]);
    });
    return json({ message: "Password changed. Please sign in again." }, 200, setCookie("", 0, request));
  }

  if (action === "wishlist") {
    const data = z.object({ slug: z.string().max(220), saved: z.boolean() }).parse(input);
    const products = await queryRows<any>("SELECT id FROM products WHERE slug = ? AND deleted_at IS NULL", [data.slug]);
    if (products[0]) {
      if (data.saved) await executeSql("INSERT IGNORE INTO customer_wishlists (customer_id, product_id) VALUES (?, ?)", [user.id, products[0].id]);
      else await executeSql("DELETE FROM customer_wishlists WHERE customer_id = ? AND product_id = ?", [user.id, products[0].id]);
    } else if (data.saved) throw new ApiError(400, "This product is no longer available.");
    return json(await mysqlCustomerData(user));
  }

  if (action === "order-create") return await mysqlCreateOrder(user, input);

  if (action === "order-cancel" || action === "order-review") {
    const data = action === "order-cancel"
      ? z.object({ id: z.string().max(64), reason: z.enum(["Ordered by mistake", "Need to change address", "Need to change product", "Found a better option", "Delivery is taking too long", "Other reason"]).default("Other reason") }).parse(input)
      : z.object({ id: z.string().max(64), slug: z.string().max(220), rating: z.number().int().min(1).max(5), reviewText: z.string().trim().min(8).max(1000) }).parse(input);
    const { mysqlTransaction } = await import("./mysql.server");
    await mysqlTransaction(async (connection) => {
      const [orders] = await connection.query<any[]>(
        "SELECT id, order_status, customer_note FROM orders WHERE order_number = ? AND customer_id = ? AND deleted_at IS NULL FOR UPDATE", [data.id, user.id],
      );
      const order = orders[0];
      if (!order) throw new ApiError(404, "Order not found.");
      if ("reason" in data) {
        if (order.order_status === "CANCELLED") return;
        if (!["NEW", "CONFIRMED", "PROCESSING", "PACKED"].includes(order.order_status)) throw new ApiError(409, "This order can no longer be cancelled.");
        let metadata = {};
        try { metadata = JSON.parse(order.customer_note || "{}"); } catch { /* Older notes may be plain text. */ }
        await connection.execute("UPDATE orders SET order_status = 'CANCELLED', cancelled_at = NOW(), customer_note = ? WHERE id = ? AND customer_id = ?",
          [JSON.stringify({ ...metadata, cancellationReason: data.reason }), order.id, user.id]);
        await connection.execute("INSERT INTO order_status_history (order_id, previous_status, new_status, note) VALUES (?, ?, 'CANCELLED', ?)", [order.id, order.order_status, data.reason]);
      } else {
        if (order.order_status !== "DELIVERED") throw new ApiError(409, "Reviews open after delivery.");
        const [items] = await connection.query<any[]>("SELECT product_id FROM order_items WHERE order_id = ? AND product_slug = ?", [order.id, data.slug]);
        if (!items[0]?.product_id) throw new ApiError(400, "Product not found in this order.");
        const [reviews] = await connection.query<any[]>("SELECT id FROM reviews WHERE customer_id = ? AND order_id = ? AND product_id = ? AND deleted_at IS NULL", [user.id, order.id, items[0].product_id]);
        if (reviews[0]) await connection.execute("UPDATE reviews SET rating = ?, review_text = ?, status = 'PENDING', moderated_at = NULL, moderated_by_admin_id = NULL, moderation_note = NULL WHERE id = ?", [data.rating, data.reviewText, reviews[0].id]);
        else await connection.execute("INSERT INTO reviews (customer_id, order_id, product_id, rating, review_text, is_verified_purchase) VALUES (?, ?, ?, ?, ?, 1)", [user.id, order.id, items[0].product_id, data.rating, data.reviewText]);
      }
    });
    return json(await mysqlCustomerData(user));
  }

  if (action === "address-save" || action === "address-delete") {
    // MySQL uses numeric IDs; SQLite's address schema continues to require UUIDs.
    const idSchema = z.string().regex(/^[1-9][0-9]{0,19}$/, "Invalid address ID.");
    const data = action === "address-save"
      ? addressSchema.extend({ id: idSchema.optional() }).parse(input)
      : z.object({ id: idSchema }).parse(input);
    const { mysqlTransaction } = await import("./mysql.server");
    await mysqlTransaction(async (connection) => {
      // Serialize changes per customer so limits and the default address stay consistent.
      await connection.query("SELECT id FROM customers WHERE id = ? FOR UPDATE", [user.id]);
      const [result] = await connection.query(
        "SELECT id, is_default FROM customer_addresses WHERE customer_id = ? AND deleted_at IS NULL FOR UPDATE",
        [user.id],
      );
      const current = result as { id: string | number; is_default: number }[];
      const existing = current.find((address) => String(address.id) === data.id);
      if (data.id && !existing) throw new ApiError(404, "Address not found.");
      if (action === "address-save" && "name" in data) {
        if (!existing && current.length >= 10) throw new ApiError(400, "You can save up to 10 addresses.");
        const isDefault = data.isDefault || !current.length || Boolean(Number(existing?.is_default));
        if (isDefault) {
          await connection.execute(
            "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND deleted_at IS NULL",
            [user.id],
          );
        }
        const values = [data.label.toUpperCase(), data.name, data.phone, data.line1, data.line2,
          data.city, data.state, data.pin, isDefault ? 1 : 0];
        if (existing) {
          await connection.execute(
            `UPDATE customer_addresses SET label = ?, recipient_name = ?, mobile = ?, address_line1 = ?,
             address_line2 = ?, city = ?, state = ?, pincode = ?, is_default = ?
             WHERE id = ? AND customer_id = ? AND deleted_at IS NULL`,
            [...values, String(existing.id), user.id],
          );
        } else {
          await connection.execute(
            `INSERT INTO customer_addresses (label, recipient_name, mobile, address_line1, address_line2,
             city, state, pincode, is_default, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [...values, user.id],
          );
        }
      } else {
        await connection.execute(
          "UPDATE customer_addresses SET deleted_at = NOW(), is_default = 0 WHERE id = ? AND customer_id = ? AND deleted_at IS NULL",
          [data.id || "", user.id],
        );
        if (Number(existing?.is_default)) {
          const replacement = current.find((address) => String(address.id) !== data.id);
          if (replacement) await connection.execute(
            "UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ? AND deleted_at IS NULL",
            [replacement.id, user.id],
          );
        }
      }
    });
    return json(await mysqlCustomerData(user));
  }

  throw new ApiError(404, "Not found.");
}
async function mysqlLimit(key: string, max: number, window = 15 * 60 * 1000) {
  const { queryRows, executeSql } = await import("./mysql.server");
  const rateKey = hash(key);
  const expiresAt = mysqlDateTime(new Date(Date.now() + window));
  await executeSql("DELETE FROM auth_rate_limits WHERE expires_at <= NOW()");
  await executeSql(
    `INSERT INTO auth_rate_limits (rate_key, attempt_count, expires_at)
     VALUES (?, 1, ?)
     ON DUPLICATE KEY UPDATE
       attempt_count = IF(expires_at <= NOW(), 1, attempt_count + 1),
       expires_at = IF(expires_at <= NOW(), VALUES(expires_at), expires_at)`,
    [rateKey, expiresAt],
  );
  const rows = await queryRows<any>("SELECT attempt_count FROM auth_rate_limits WHERE rate_key = ?", [
    rateKey,
  ]);
  if (Number(rows[0]?.attempt_count || 0) > max) {
    throw new ApiError(429, "Too many attempts. Please try again in 15 minutes.");
  }
}
function mysqlDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
function limit(key: string, max: number, window = 15 * 60 * 1000) {
  const db = database();
  const now = Date.now();
  db.prepare("DELETE FROM auth_limits WHERE expires_at<=?").run(now);
  const k = hash(key);
  db.prepare(
    "INSERT INTO auth_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).run(k, now + window);
  const row = db.prepare("SELECT count FROM auth_limits WHERE key=?").get(k) as { count: number };
  if (row.count > max)
    throw new ApiError(429, "Too many attempts. Please try again in 15 minutes.");
}
function rows<T>(table: "addresses" | "orders", id: string): T[] {
  return (
    database().prepare(`SELECT data FROM ${table} WHERE user_id=? ORDER BY rowid DESC`).all(id) as {
      data: string;
    }[]
  ).map((r) => JSON.parse(r.data) as T);
}
function customerData(user: Row) {
  return {
    user: publicUser(user),
    addresses: rows<Address>("addresses", user.id),
    wishlist: (
      database().prepare("SELECT slug FROM wishlists WHERE user_id=?").all(user.id) as {
        slug: string;
      }[]
    ).map((r) => r.slug),
    orders: rows<CustomerOrder>("orders", user.id),
  };
}

async function activeCouponDiscount(code: string, subtotal: number): Promise<CouponDiscount> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return false;
  if (!process.env["MYSQL_HOST"] || !process.env["MYSQL_USER"] || !process.env["MYSQL_DATABASE"]) {
    return normalizedCode === "RISE10";
  }

  try {
    const { queryRows } = await import("./mysql.server");
    const rows = await queryRows<{
      discount_type: "PERCENTAGE" | "FIXED";
      discount_value: number | string;
      minimum_order_amount: number | string;
      maximum_discount_amount: number | string | null;
    }>(
      `SELECT discount_type, discount_value, minimum_order_amount, maximum_discount_amount
       FROM coupons
       WHERE code = ?
         AND deleted_at IS NULL
         AND status = 'ACTIVE'
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (expires_at IS NULL OR expires_at >= NOW())
       LIMIT 1`,
      [normalizedCode],
    );
    const coupon = rows[0];
    if (!coupon) return false;
    const minimumOrderAmount = Number(coupon.minimum_order_amount || 0);
    if (subtotal < minimumOrderAmount) return false;
    return {
      discountType: coupon.discount_type === "FIXED" ? "FIXED" : "PERCENTAGE",
      discountValue: Number(coupon.discount_value || 0),
      minimumOrderAmount,
      maximumDiscountAmount:
        coupon.maximum_discount_amount === null || coupon.maximum_discount_amount === undefined
          ? null
          : Number(coupon.maximum_discount_amount),
    };
  } catch {
    return false;
  }
}

async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Use a JSON request.");
  const reader = request.body?.getReader();
  if (!reader) return {};
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 32768) {
      await reader.cancel();
      throw new ApiError(413, "Request too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "Invalid request.");
  }
}
function guardOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const expected = process.env["APP_ORIGIN"] || requestOrigin;
  const origin = request.headers.get("origin");
  if (process.env["NODE_ENV"] === "production" && !process.env["APP_ORIGIN"])
    throw new ApiError(503, "Account service configuration is incomplete.");
  const localOrigin =
    process.env["NODE_ENV"] !== "production" &&
    origin &&
    new URL(origin).hostname === "localhost" &&
    new URL(requestOrigin).hostname === "localhost";
  if (
    (origin !== expected && !localOrigin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ApiError(403, "This request could not be verified. Refresh the page and try again.");
}
export async function handleCustomerRequest(request: Request, action: string): Promise<Response> {
  try {
    if (hasMysqlCustomerStore()) {
      return await handleMysqlCustomerRequest(request, action);
    }
    // Local SQLite is not durable on Vercel. Keep browsing available until
    // a hosted database adapter is connected; never create throwaway accounts.
    if (process.env["VERCEL"] === "1") {
      if (request.method === "GET" && action === "session") {
        return json({ user: null, addresses: [], wishlist: [], orders: [] });
      }
      return json(
        {
          error:
            "Customer accounts are not available on this site yet. Please try again after launch.",
        },
        503,
      );
    }
    const db = database();
    if (request.method === "GET") {
      if (action !== "session") throw new ApiError(404, "Not found.");
      const user = sessionUser(request);
      return json(
        user ? customerData(user) : { user: null, addresses: [], wishlist: [], orders: [] },
      );
    }
    if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
    guardOrigin(request);
    const input = await readBody(request);
    if (["register", "login", "forgot-password", "reset-password"].includes(action)) {
      limit("global-auth", 200);
    }
    if (action === "register") {
      const data = z
        .object({ name, email, phone: optionalPhone, whatsappNumber, password, remember: z.boolean().default(false) })
        .parse(input);
      limit("register:" + data.email, 5);
      const passwordHash = await hashPassword(data.password);
      const id = randomUUID();
      try {
        db.prepare(
          "INSERT INTO customers (id,name,email,phone,whatsapp_number,password_hash,created_at) VALUES(?,?,?,?,?,?,?)",
        ).run(
          id,
          data.name,
          data.email,
          data.phone,
          data.whatsappNumber,
          passwordHash,
          new Date().toISOString(),
        );
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          throw new ApiError(
            409,
            "An account with these details already exists. Please sign in or reset your password.",
          );
        throw error;
      }
      const user = db.prepare("SELECT * FROM customers WHERE id=?").get(id) as Row;
      return json(customerData(user), 201, newSession(id, data.remember, request));
    }
    if (action === "login") {
      const data = z
        .object({
          identifier: z.string().trim().toLowerCase().min(3).max(254),
          password: z.string().max(128),
          remember: z.boolean().default(false),
        })
        .parse(input);
      limit("login:" + data.identifier, 10);
      const user = db
        .prepare("SELECT * FROM customers WHERE email=? OR phone=?")
        .get(data.identifier, data.identifier) as Row | undefined;
      const valid = await verifyPassword(
        data.password,
        user?.password_hash || "scrypt:00000000000000000000000000000000:" + "00".repeat(64),
      );
      if (!user || !valid) throw new ApiError(401, "Email/mobile number or password is incorrect.");
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(token(request)));
      return json(customerData(user), 200, newSession(user.id, data.remember, request));
    }
    if (action === "logout") {
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(token(request)));
      return json({ ok: true }, 200, setCookie("", 0, request));
    }
    if (action === "forgot-password") {
      const data = z.object({ email }).parse(input);
      limit("reset:" + data.email, 3);
      const provider = process.env["RESEND_API_KEY"],
        devOutbox =
          process.env["NODE_ENV"] !== "production" && process.env["AUTH_DEV_OUTBOX"] === "true";
      if (!provider && !devOutbox)
        throw new ApiError(
          503,
          "Password reset email is not configured yet. Please contact support.",
        );
      const user = db.prepare("SELECT * FROM customers WHERE email=?").get(data.email) as
        Row | undefined;
      if (user) {
        const t = randomBytes(32).toString("hex");
        db.prepare("DELETE FROM reset_tokens WHERE user_id=?").run(user.id);
        db.prepare("INSERT INTO reset_tokens VALUES(?,?,?)").run(
          hash(t),
          user.id,
          Date.now() + 30 * 60 * 1000,
        );
        const origin = process.env["APP_ORIGIN"] || new URL(request.url).origin;
        const url = `${origin}/reset-password?token=${t}`;
        if (provider) {
          const result = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${provider}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: process.env["AUTH_EMAIL_FROM"],
              to: [user.email],
              subject: "Reset your SheRise password",
              text: `Use this link within 30 minutes to reset your password: ${url}\nIf you did not request this, ignore this email.`,
            }),
          });
          if (!result.ok) {
            db.prepare("DELETE FROM reset_tokens WHERE user_id=?").run(user.id);
            throw new ApiError(503, "Email service is unavailable. Please try again later.");
          }
        } else {
          const directory = resolve("data/dev-mail");
          mkdirSync(directory, { recursive: true });
          writeFileSync(
            resolve(directory, `${user.id}.json`),
            JSON.stringify({ to: user.email, url }),
          );
        }
      }
      return json({
        message:
          "If an account exists for this email, a reset link has been requested. Check your inbox.",
      });
    }
    if (action === "reset-password") {
      const data = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password }).parse(input);
      const passwordHash = await hashPassword(data.password);
      transaction(() => {
        const row = db
          .prepare("SELECT user_id FROM reset_tokens WHERE token_hash=? AND expires_at>?")
          .get(hash(data.token), Date.now()) as { user_id: string } | undefined;
        if (!row)
          throw new ApiError(400, "This reset link is invalid or expired. Request a new one.");
        db.prepare("UPDATE customers SET password_hash=? WHERE id=?").run(
          passwordHash,
          row.user_id,
        );
        db.prepare("DELETE FROM reset_tokens WHERE user_id=?").run(row.user_id);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(row.user_id);
      });
      return json({ message: "Password updated. Please sign in." }, 200, setCookie("", 0, request));
    }
    const user = requireUser(request);
    limit("customer-write:" + user.id, 120);
    if (action === "profile") {
      const data = z.object({ name, phone: optionalPhone, whatsappNumber }).parse(input);
      try {
        db.prepare("UPDATE customers SET name=?,phone=?,whatsapp_number=? WHERE id=?").run(
          data.name,
          data.phone,
          data.whatsappNumber,
          user.id,
        );
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          throw new ApiError(409, "That mobile number is already registered.");
        throw error;
      }
    } else if (action === "password") {
      const data = z.object({ currentPassword: z.string().max(128), password }).parse(input);
      limit("password:" + user.id, 5);
      if (!(await verifyPassword(data.currentPassword, user.password_hash)))
        throw new ApiError(400, "Current password is incorrect.");
      const newHash = await hashPassword(data.password);
      transaction(() => {
        db.prepare("UPDATE customers SET password_hash=? WHERE id=?").run(newHash, user.id);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      });
      return json(
        { message: "Password changed. Please sign in again." },
        200,
        setCookie("", 0, request),
      );
    } else if (action === "address-save") {
      const a = addressSchema.parse(input);
      transaction(() => {
        const current = rows<Address>("addresses", user.id);
        if (a.id && !current.some((x) => x.id === a.id))
          throw new ApiError(404, "Address not found.");
        if (!a.id && current.length >= 10)
          throw new ApiError(400, "You can save up to 10 addresses.");
        const address = {
          ...a,
          id: a.id || randomUUID(),
          isDefault: current.length === 0 || a.isDefault,
        };
        if (address.isDefault)
          for (const other of current)
            db.prepare("UPDATE addresses SET data=? WHERE id=? AND user_id=?").run(
              JSON.stringify({ ...other, isDefault: false }),
              other.id,
              user.id,
            );
        else if (current.find((x) => x.id === a.id)?.isDefault) address.isDefault = true;
        db.prepare(
          "INSERT INTO addresses VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE addresses.user_id=excluded.user_id",
        ).run(address.id, user.id, JSON.stringify(address));
      });
    } else if (action === "address-delete") {
      const { id } = z.object({ id: z.string().uuid() }).parse(input);
      transaction(() => {
        const result = db
          .prepare("DELETE FROM addresses WHERE id=? AND user_id=?")
          .run(id, user.id);
        if (!result.changes) throw new ApiError(404, "Address not found.");
        const rest = rows<Address>("addresses", user.id);
        if (rest.length && !rest.some((a) => a.isDefault))
          db.prepare("UPDATE addresses SET data=? WHERE id=? AND user_id=?").run(
            JSON.stringify({ ...rest[0], isDefault: true }),
            rest[0]!.id,
            user.id,
          );
      });
    } else if (action === "wishlist") {
      const data = z.object({ slug: z.string(), saved: z.boolean() }).parse(input);
      if (data.saved)
        db.prepare("INSERT OR IGNORE INTO wishlists VALUES(?,?)").run(user.id, data.slug);
      else db.prepare("DELETE FROM wishlists WHERE user_id=? AND slug=?").run(user.id, data.slug);
    } else if (action === "order-create") {
      const data = z
        .object({
          requestId: z.string().uuid(),
          address: addressSchema,
          items: z
            .array(
              z.object({
                slug: z.string(),
                size: z.string(),
                flow: z.string(),
                pack: z.string(),
                quantity: z.number().int().min(1).max(99),
                price: z.number().nonnegative().optional(),
                name: z.string().max(200).optional(),
                image: z.string().max(500).optional(),
              }),
            )
            .min(1)
            .max(50),
          coupon: z.string().trim().max(50).default(""),
          donationAmount: z.union([z.literal(0), z.literal(10), z.literal(20), z.literal(50), z.literal(80), z.literal(100)]).default(0),
          payment: z.enum(["UPI", "Cards", "Net Banking", "Wallet", "Cash on Delivery"]),
        })
        .parse(input);
      const existing = db
        .prepare("SELECT data FROM orders WHERE user_id=? AND request_id=?")
        .get(user.id, data.requestId) as { data: string } | undefined;
      if (existing) return json({ order: JSON.parse(existing.data) });
      const packTotals = new Map<string, number>();
      const items: OrderItem[] = data.items.map((i) => {
        const p = getProduct(i.slug),
          pack = p?.packOptions.find((v) => v.label === i.pack);
        if (!p) {
          const price = Number(i.price);
          if (!i.name || !Number.isFinite(price) || price <= 0) {
            throw new ApiError(400, "Invalid product selection.");
          }
          return { ...i, name: i.name, price, image: i.image };
        }
        if (!pack || !p.sizes.includes(i.size) || !p.flow.includes(i.flow))
          throw new ApiError(400, "Invalid product selection.");
        const key = i.slug + "|" + i.pack;
        const qty = (packTotals.get(key) || 0) + i.quantity;
        packTotals.set(key, qty);
        if (pack.stock > 0 && qty > pack.stock) throw new ApiError(409, `${p.name} does not have enough stock.`);
        return { ...i, name: p.name, price: pack.price, image: i.image || p.images[0] };
      });
      const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
      const couponDiscount = await activeCouponDiscount(data.coupon, subtotal);
      const totals = calculateOrderTotals(subtotal, couponDiscount, data.donationAmount);
      if (totals.total >= COD_MINIMUM_TOTAL && data.payment !== "Cash on Delivery") {
        throw new ApiError(400, "Orders of ₹1,000 and above are Cash on Delivery only.");
      }
      if (totals.total < COD_MINIMUM_TOTAL && data.payment === "Cash on Delivery") {
        throw new ApiError(400, "Cash on Delivery is available only on orders of ₹1,000 and above.");
      }
      const order: CustomerOrder = {
        id: "SR-" + randomUUID().slice(0, 12).toUpperCase(),
        createdAt: new Date().toISOString(),
        items,
        address: { ...data.address, id: data.address.id || randomUUID() },
        subtotal: totals.subtotal,
        discount: totals.discountAmount,
        gstPercent: totals.gstPercent,
        gstAmount: totals.gstAmount,
        shippingAmount: totals.shippingAmount,
        donationAmount: totals.donationAmount,
        total: totals.total,
        status: "preview",
        payment: data.payment,
      };
      db.prepare("INSERT INTO orders VALUES(?,?,?,?)").run(
        order.id,
        user.id,
        data.requestId,
        JSON.stringify(order),
      );
      return json({ order }, 201);
    } else if (action === "order-cancel") {
      const { id, reason } = z
        .object({
          id: z.string().max(64),
          reason: z
            .enum([
              "Ordered by mistake",
              "Need to change address",
              "Need to change product",
              "Found a better option",
              "Delivery is taking too long",
              "Other reason",
            ])
            .default("Other reason"),
        })
        .parse(input);
      const row = db
        .prepare("SELECT data FROM orders WHERE id=? AND user_id=?")
        .get(id, user.id) as { data: string } | undefined;
      if (!row) throw new ApiError(404, "Order not found.");
      const order = JSON.parse(row.data) as CustomerOrder;
      if (order.status === "delivered") throw new ApiError(409, "Delivered orders cannot be cancelled.");
      order.status = "cancelled";
      order.cancellationReason = reason;
      order.cancelledAt = new Date().toISOString();
      db.prepare("UPDATE orders SET data=? WHERE id=? AND user_id=?").run(
        JSON.stringify(order),
        id,
        user.id,
      );
    } else if (action === "order-review") {
      const { id, slug, rating, reviewText } = z
        .object({
          id: z.string().max(64),
          slug: z.string().max(120),
          rating: z.number().int().min(1).max(5),
          reviewText: z.string().trim().min(8, "Write at least 8 characters.").max(1000),
        })
        .parse(input);
      const row = db
        .prepare("SELECT data FROM orders WHERE id=? AND user_id=?")
        .get(id, user.id) as { data: string } | undefined;
      if (!row) throw new ApiError(404, "Order not found.");
      const order = JSON.parse(row.data) as CustomerOrder;
      if (order.status !== "delivered") throw new ApiError(409, "Reviews open after delivery.");
      if (!order.items.some((item) => item.slug === slug)) throw new ApiError(400, "Product not found in this order.");
      const reviews = order.reviews ?? [];
      const review = { slug, rating, reviewText, reviewedAt: new Date().toISOString(), status: "PENDING" as const };
      const existingIndex = reviews.findIndex((item) => item.slug === slug);
      if (existingIndex >= 0) reviews[existingIndex] = review;
      else reviews.push(review);
      order.reviews = reviews;
      db.prepare("UPDATE orders SET data=? WHERE id=? AND user_id=?").run(
        JSON.stringify(order),
        id,
        user.id,
      );
    } else throw new ApiError(404, "Not found.");
    return json(customerData(db.prepare("SELECT * FROM customers WHERE id=?").get(user.id) as Row));
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ error: error.issues[0]?.message || "Please check your details." }, 400);
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    // Log diagnostic codes, never SQL text/parameters, account details or session tokens.
    const diagnostic = error as { code?: string; errno?: number; sqlState?: string } | null;
    console.error("Customer service failed:", {
      action, name: error instanceof Error ? error.name : "Unknown error",
      code: diagnostic?.code, errno: diagnostic?.errno, sqlState: diagnostic?.sqlState,
    });
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
