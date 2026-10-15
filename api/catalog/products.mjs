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

  try {
    const slug = new URL(req.url || "/", "http://localhost").searchParams.get("slug") || undefined;
    if (slug && slug.length > 220) {
      res.status(400).json({ products: [], error: "Invalid product." });
      return;
    }
    const products = await loadCatalogProducts(slug);
    res.status(200).json({ products, source: "mysql" });
  } catch (error) {
    console.error("Catalog MySQL API failed:", error instanceof Error ? error.message : error);
    res.status(500).json({ products: [], error: "Catalog MySQL connection failed." });
  }
}

async function queryRows(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function executeSql(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

async function loadCatalogProducts(slug) {
  await ensureCatalogSchema();
  const rows = await queryRows(`
    SELECT
      p.id,
      p.slug,
      p.name,
      p.short_description,
      p.description,
      c.name AS category_name,
      p.mrp,
      p.selling_price,
      p.discount_percent,
      p.sku,
      p.pack_quantity,
      p.flow_type,
      p.product_dimensions,
      p.pad_length,
      p.front_pack_content,
      p.anion_strip_notes,
      p.brand_message,
      p.storage_instruction,
      p.material_composition,
      p.features,
      p.usage_instructions,
      p.disposal_instructions,
      p.safety_information,
      p.manufacturer_details,
      p.marketer_details,
      p.product_contact,
      p.product_email,
      p.product_website,
      p.shelf_life,
      p.is_featured,
      (
        SELECT COALESCE(SUM(i.current_stock), 0)
        FROM inventory i
        WHERE i.product_id = p.id
      ) AS stock
    FROM products p
    JOIN product_categories c ON c.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND p.status = 'ACTIVE'
      ${slug ? "AND p.slug = ?" : ""}
    ORDER BY p.is_featured DESC, p.created_at DESC, p.id DESC
    ${slug ? "LIMIT 1" : ""}
  `, slug ? [slug] : []);

  const imageMap = await productImagesById(rows.map((row) => row.id));
  return rows.map((row) => productRowToProduct(row, imageMap.get(Number(row.id)) || []));
}

let catalogSchemaReady;
function ensureCatalogSchema() {
  catalogSchemaReady ??= prepareCatalogSchema().catch((error) => {
    catalogSchemaReady = undefined;
    throw error;
  });
  return catalogSchemaReady;
}

async function prepareCatalogSchema() {
  const columns = [
    ["product_dimensions", "VARCHAR(120) NULL"],
    ["pad_length", "VARCHAR(80) NULL"],
    ["front_pack_content", "TEXT NULL"],
    ["anion_strip_notes", "TEXT NULL"],
    ["brand_message", "TEXT NULL"],
    ["storage_instruction", "VARCHAR(200) NULL"],
    ["material_composition", "TEXT NULL"],
    ["manufacturer_details", "TEXT NULL"],
    ["marketer_details", "TEXT NULL"],
    ["product_contact", "VARCHAR(80) NULL"],
    ["product_email", "VARCHAR(254) NULL"],
    ["product_website", "VARCHAR(200) NULL"],
    ["shelf_life", "VARCHAR(120) NULL"],
  ];

  for (const [column, definition] of columns) {
    try {
      await executeSql(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!/duplicate column|Duplicate column/i.test(String(error?.message || error))) throw error;
    }
  }

  try {
    await executeSql("ALTER TABLE product_images MODIFY image_url LONGTEXT NOT NULL");
  } catch (error) {
    if (!/data too long|doesn't exist|unknown table/i.test(String(error?.message || error))) throw error;
  }
}

async function productImagesById(productIds) {
  const ids = productIds.map(Number).filter(Number.isFinite);
  const imagesById = new Map();
  if (!ids.length) return imagesById;

  const placeholders = ids.map(() => "?").join(",");
  const rows = await queryRows(
    `
      SELECT product_id, image_url
      FROM product_images
      WHERE product_id IN (${placeholders})
      ORDER BY product_id ASC, is_featured DESC, sort_order ASC
    `,
    ids,
  );

  for (const row of rows) {
    const productId = Number(row.product_id);
    const imageUrl = normalizeImagePath(String(row.image_url || ""));
    if (!imageUrl) continue;
    const current = imagesById.get(productId) || [];
    current.push(imageUrl);
    imagesById.set(productId, current);
  }

  return imagesById;
}

function productRowToProduct(row, images) {
  const mrp = Number(row.mrp || 0);
  const salePrice = Number(row.selling_price || 0);
  const stock = Number(row.stock || 0);
  const isComboOffer = /combo/i.test(`${row.slug} ${row.name} ${row.pack_quantity || ""}`);
  const packOptions = isComboOffer
    ? [
        { label: "7 Pads - 4 XXXL + 3 XXL", price: salePrice, mrp, stock },
        { label: "7 Pads - 4 XXL + 3 XXXL", price: salePrice, mrp, stock },
        { label: "20 Pads - 12 XXXL + 8 XXL", price: Math.round(salePrice * 2.55), mrp: Math.round(mrp * 2.5), stock },
        { label: "20 Pads - 12 XXL + 8 XXXL", price: Math.round(salePrice * 2.55), mrp: Math.round(mrp * 2.5), stock },
      ]
    : [{ label: row.pack_quantity || "Default Pack", price: salePrice, mrp, stock }];

  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description || row.name,
    description: row.description || row.short_description || row.name,
    category: row.category_name === "Period Care" ? "Period Care" : "Sanitary Pads",
    images,
    sizes: isComboOffer ? ["XXL", "XXXL"] : ["XL", "XXL", "XXXL"],
    flow: row.flow_type ? String(row.flow_type).split(",").map((item) => item.trim()).filter(Boolean) : ["Medium"],
    packOptions,
    mrp,
    salePrice,
    discount: Number(row.discount_percent || 0),
    stock,
    sku: row.sku,
    rating: 0,
    reviewCount: 0,
    features: jsonList(row.features, ["Connected from SheRise MySQL catalog"]),
    materials: row.material_composition ? [row.material_composition] : ["Material details will be updated from product specifications."],
    usageInstructions: jsonList(row.usage_instructions, ["Follow the instructions provided on the product pack."]),
    disposalInstructions: jsonList(row.disposal_instructions, ["Wrap and dispose responsibly. Do not flush."]),
    faq: productInfoFaq(row),
    relatedProducts: [],
    featured: Number(row.is_featured) === 1,
  };
}

function productInfoFaq(row) {
  const items = [];
  const packDetails = [row.front_pack_content, row.product_dimensions, row.pad_length].filter(Boolean).join("\n");
  if (packDetails) items.push({ q: "Pack content", a: packDetails });
  if (row.brand_message) items.push({ q: "SheRise brand message", a: row.brand_message });
  if (row.storage_instruction || row.shelf_life) {
    items.push({
      q: "Storage & best before",
      a: [row.storage_instruction, row.shelf_life ? `Best before: ${row.shelf_life}` : ""].filter(Boolean).join("\n"),
    });
  }
  const companyDetails = [
    row.manufacturer_details ? `Manufactured by: ${row.manufacturer_details}` : "",
    row.marketer_details ? `Marketed by: ${row.marketer_details}` : "",
    row.product_contact ? `Contact: ${row.product_contact}` : "",
    row.product_email ? `Email: ${row.product_email}` : "",
    row.product_website ? `Website: ${row.product_website}` : "",
  ].filter(Boolean).join("\n");
  if (companyDetails) items.push({ q: "Product information", a: companyDetails });
  const safetyNotes = [row.safety_information, row.anion_strip_notes].filter(Boolean).join("\n\n");
  if (safetyNotes) items.push({ q: "Safety & packaging notes", a: safetyNotes });
  return items;
}

function jsonList(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Older records may contain comma or newline separated values.
  }
  const items = String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function normalizeImagePath(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const fallbackProductUploadImage = "/uploads/products/1790248547777-eabeac00-product.png";
  const fallbackFileName = trimmed.split(/[\\/]/).filter(Boolean).at(-1)?.toLowerCase() || trimmed.toLowerCase();
  if (fallbackFileName === "pad.jpg" || fallbackFileName === "product.jpg") return fallbackProductUploadImage;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }
  return `/uploads/products/${fallbackFileName}`;
}

function setJsonHeaders(res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
}
