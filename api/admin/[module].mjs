import { createPool } from "mysql2/promise";

import { assertAdminRequest } from "../_admin-session.mjs";

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
    assertAdminRequest(req);

    const moduleName = Array.isArray(req.query.module) ? req.query.module[0] : req.query.module;
    if (moduleName === "products") {
      res.status(200).json(await productsPayload());
      return;
    }
    if (moduleName === "categories") {
      res.status(200).json(await categoriesPayload());
      return;
    }
    if (moduleName === "inventory") {
      res.status(200).json(await inventoryPayload());
      return;
    }

    res.status(200).json(emptyPayload(moduleName || "admin"));
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    console.error("Admin MySQL API failed:", error instanceof Error ? error.message : error);
    res.status(statusCode).json({
      error:
        statusCode === 401
          ? "Admin login required."
          : "MySQL connection failed. Check production environment variables and database access.",
    });
  }
}

async function queryRows(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function productsPayload() {
  const rows = await queryRows(`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.sku,
      c.name AS category_name,
      p.selling_price,
      p.mrp,
      p.flow_type,
      p.status,
      p.is_featured,
      COALESCE(SUM(i.current_stock), 0) AS stock,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_featured DESC, pi.sort_order ASC
        LIMIT 1
      ) AS image_url
    FROM products p
    JOIN product_categories c ON c.id = p.category_id
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.created_at DESC, p.id DESC
  `);

  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const draft = rows.filter((row) => row.status === "DRAFT").length;
  const lowStock = rows.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= 5).length;
  const outOfStock = rows.filter((row) => Number(row.stock) === 0).length;

  return {
    title: "Products",
    action: "Add Product",
    columns: ["Product", "Image", "SKU", "Category", "Price", "Stock", "Flow", "Status"],
    rows: rows.map((row) => [
      value(row.name),
      row.image_url ? normalizeImagePath(row.image_url) : "No Image",
      value(row.sku),
      value(row.category_name),
      `Rs.${Number(row.selling_price || 0).toLocaleString("en-IN")}`,
      String(row.stock || 0),
      value(row.flow_type, "-"),
      value(row.status, "ACTIVE"),
    ]),
    metrics: [
      { label: "Total Products", value: String(rows.length), trend: `${draft} draft`, tone: draft ? "warn" : "up" },
      { label: "Active Products", value: String(active), trend: "Store visible", tone: "up" },
      { label: "Low Stock", value: String(lowStock), trend: "Needs restock", tone: lowStock ? "warn" : "up" },
      {
        label: "Out of Stock",
        value: String(outOfStock),
        trend: outOfStock ? "Urgent" : "Clean",
        tone: outOfStock ? "danger" : "up",
      },
    ],
    source: "mysql",
  };
}

async function categoriesPayload() {
  const rows = await queryRows(`
    SELECT
      c.name,
      c.slug,
      c.display_in_navigation,
      c.seo_title,
      c.seo_description,
      c.sort_order,
      c.status,
      COUNT(p.id) AS product_count
    FROM product_categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `);

  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const visible = rows.filter((row) => Number(row.display_in_navigation) === 1).length;
  const seoMissing = rows.filter((row) => !row.seo_title || !row.seo_description).length;

  return {
    title: "Categories",
    action: "Add Category",
    columns: ["Category", "Slug", "Products", "Navigation", "SEO", "Sort", "Status"],
    rows: rows.map((row) => [
      value(row.name),
      value(row.slug),
      String(row.product_count || 0),
      Number(row.display_in_navigation) === 1 ? "Shown" : "Hidden",
      row.seo_title && row.seo_description ? "Ready" : "Needs Meta",
      String(row.sort_order || 0),
      value(row.status, "ACTIVE"),
    ]),
    metrics: [
      { label: "Categories", value: String(rows.length), trend: `${active} active`, tone: "up" },
      { label: "Menu Items", value: String(visible), trend: "Visible", tone: "neutral" },
      { label: "SEO Missing", value: String(seoMissing), trend: seoMissing ? "Review" : "Clean", tone: seoMissing ? "warn" : "up" },
      {
        label: "Inactive",
        value: String(rows.length - active),
        trend: rows.length === active ? "Clean" : "Hidden",
        tone: rows.length === active ? "up" : "warn",
      },
    ],
    source: "mysql",
  };
}

async function inventoryPayload() {
  const rows = await queryRows(`
    SELECT
      p.id,
      p.name,
      p.sku,
      p.pack_quantity,
      COALESCE(SUM(i.current_stock), 0) AS stock,
      MIN(i.low_stock_threshold) AS low_stock_threshold,
      p.status
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.created_at DESC, p.id DESC
  `);

  const lowStock = rows.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= Number(row.low_stock_threshold || 5));
  const outOfStock = rows.filter((row) => Number(row.stock) === 0);
  const totalStock = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);

  return {
    title: "Inventory",
    action: "Stock Entry",
    columns: ["Item", "SKU", "Pack", "Stock", "Alert"],
    rows: rows.map((row) => {
      const stock = Number(row.stock || 0);
      const threshold = Number(row.low_stock_threshold || 5);
      return [
        value(row.name),
        value(row.sku),
        value(row.pack_quantity, "-"),
        String(stock),
        stock === 0 ? "OUT OF STOCK" : stock <= threshold ? "LOW STOCK" : "ACTIVE",
      ];
    }),
    metrics: [
      { label: "SKUs", value: String(rows.length), trend: "Catalog items", tone: "neutral" },
      { label: "Current Stock", value: String(totalStock), trend: "Live MySQL stock", tone: "up" },
      { label: "Low Stock", value: String(lowStock.length), trend: "Needs restock", tone: lowStock.length ? "warn" : "up" },
      {
        label: "Out of Stock",
        value: String(outOfStock.length),
        trend: outOfStock.length ? "Urgent" : "Clean",
        tone: outOfStock.length ? "danger" : "up",
      },
    ],
    source: "mysql",
  };
}

function emptyPayload(moduleName) {
  const title = titleFromSlug(moduleName);
  return {
    title,
    action: "Add New",
    columns: ["Title", "Status"],
    rows: [],
    metrics: [
      { label: title, value: "0", trend: "No live rows", tone: "neutral" },
      { label: "Source", value: "MySQL", trend: "API connected", tone: "up" },
      { label: "Pending", value: "0", trend: "Clean", tone: "up" },
      { label: "Errors", value: "0", trend: "Clean", tone: "up" },
    ],
    source: "mysql",
  };
}

function setJsonHeaders(res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
}

function normalizeImagePath(imageUrl) {
  const trimmed = String(imageUrl || "").trim();
  if (!trimmed) return "No Image";
  const fallbackProductUploadImage = "/uploads/products/1790248547777-eabeac00-product.png";
  const fileName = basename(trimmed).toLowerCase();
  if (fileName === "pad.jpg" || fileName === "product.jpg") return fallbackProductUploadImage;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/uploads/")) return trimmed;
  return `/uploads/products/${basename(trimmed)}`;
}

function basename(input) {
  return String(input || "").split(/[\\/]/).filter(Boolean).pop() || "";
}

function titleFromSlug(slug) {
  return String(slug || "Admin")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function value(input, fallback = "") {
  const text = input === null || input === undefined ? "" : String(input);
  return text || fallback;
}
