import { scrypt, randomBytes, createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { database, transaction } from "./database.server";
import { getProduct } from "../lib/catalog";
import { calculateOrderTotals } from "../lib/pricing";
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
  .default(null);
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
          coupon: z.enum(["", "RISE10"]).default(""),
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
      const totals = calculateOrderTotals(
        items.reduce((s, i) => s + i.quantity * i.price, 0),
        data.coupon === "RISE10",
      );
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
    console.error(
      "Customer service failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
