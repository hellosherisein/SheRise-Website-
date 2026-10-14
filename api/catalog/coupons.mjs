import { createPool } from "mysql2/promise";

let pool;

function getPool() {
  const missing = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"].filter(
    (key) => !process.env[key],
  );
  if (missing.length) {
    throw new Error(`Missing MySQL environment variables: ${missing.join(", ")}`);
  }

  pool ??= createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 3,
  });
  return pool;
}

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const [rows] = await getPool().query(`
      SELECT code, description, discount_type, discount_value, minimum_order_amount,
        maximum_discount_amount, starts_at, expires_at, usage_limit,
        usage_limit_per_customer, first_order_only
      FROM coupons
      WHERE deleted_at IS NULL
        AND status = 'ACTIVE'
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at >= NOW())
      ORDER BY created_at DESC, id DESC
      LIMIT 20
    `);

    res.status(200).json({
      coupons: rows.map((row) => ({
        code: value(row.code).toUpperCase(),
        description: value(row.description),
        discountType: row.discount_type === "FIXED" ? "FIXED" : "PERCENTAGE",
        discountValue: Number(row.discount_value || 0),
        minimumOrderAmount: Number(row.minimum_order_amount || 0),
        maximumDiscountAmount:
          row.maximum_discount_amount === null || row.maximum_discount_amount === undefined
            ? null
            : Number(row.maximum_discount_amount),
        startsAt: dateOnly(row.starts_at),
        expiresAt: dateOnly(row.expires_at),
        usageLimit: row.usage_limit ?? null,
        usageLimitPerCustomer: row.usage_limit_per_customer ?? null,
        firstOrderOnly: Boolean(row.first_order_only),
      })),
      source: "mysql",
    });
  } catch (error) {
    console.error("Catalog coupons API failed:", error instanceof Error ? error.message : error);
    res.status(500).json({ error: "Coupons are unavailable." });
  }
}

function setJsonHeaders(res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
}

function value(input) {
  const text = input === null || input === undefined ? "" : String(input);
  return text.trim();
}

function dateOnly(input) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
