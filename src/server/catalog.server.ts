import type { RowDataPacket } from "mysql2/promise";

import type { Product } from "@/lib/catalog";

import { executeSql, queryRows } from "./mysql.server";

type ProductRow = RowDataPacket & {
  gst_percent: number | string;
  shipping_weight_g: number | string | null;
  package_length_cm: number | string | null;
  package_width_cm: number | string | null;
  package_height_cm: number | string | null;
  id: number;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category_name: string | null;
  category_names: string | null;
  mrp: number | string;
  selling_price: number | string;
  discount_percent: number | string;
  sku: string;
  pack_quantity: string | null;
  flow_type: string | null;
  product_dimensions: string | null;
  pad_length: string | null;
  front_pack_content: string | null;
  anion_strip_notes: string | null;
  brand_message: string | null;
  storage_instruction: string | null;
  material_composition: string | null;
  features: unknown;
  usage_instructions: unknown;
  disposal_instructions: unknown;
  safety_information: string | null;
  manufacturer_details: string | null;
  marketer_details: string | null;
  product_contact: string | null;
  product_email: string | null;
  product_website: string | null;
  shelf_life: string | null;
  is_featured: number;
  stock: number | string;
  image_urls: string | null;
};

export async function handleCatalogRequest(request?: Request): Promise<Response> {
  try {
    const slug = request ? new URL(request.url).searchParams.get("slug") : null;
    if (slug) {
      if (slug.length > 220) return json({ products: [], error: "Invalid product." }, 400);
      const product = await loadCatalogProduct(slug);
      return json({ products: product ? [product] : [], source: "mysql" });
    }
    return json({ products: await loadCatalogProducts(), source: "mysql" });
  } catch (error) {
    console.error("Catalog MySQL API failed:", error instanceof Error ? error.message : error);
    return json({ products: [], error: "Catalog MySQL connection failed." }, 500);
  }
}

export async function loadCatalogProducts(): Promise<Product[]> {
  await ensureCatalogPackagingColumns();
  const rows = await queryRows<ProductRow>(`
    SELECT
      p.id,
      p.slug,
      p.name,
      p.short_description,
      p.description,
      c.name AS category_name,
      COALESCE((
        SELECT GROUP_CONCAT(pc.name ORDER BY pca.sort_order, pc.name SEPARATOR '||')
        FROM product_category_assignments pca
        JOIN product_categories pc ON pc.id = pca.category_id
        WHERE pca.product_id = p.id
      ), c.name) AS category_names,
      p.gst_percent,
      p.mrp,
      p.selling_price,
      p.discount_percent,
      p.sku,
      p.pack_quantity,
      p.flow_type,
      p.shipping_weight_g, p.package_length_cm, p.package_width_cm, p.package_height_cm,
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
        SELECT COALESCE(SUM(GREATEST(0, i.current_stock - i.reserved_stock)), 0)
        FROM inventory i
        WHERE i.product_id = p.id
      ) AS stock,
      (
        SELECT GROUP_CONCAT(
          CASE WHEN LEFT(pi.image_url, 11) = 'data:image/'
            THEN CONCAT('/api/catalog/product-image?id=', pi.id)
            ELSE pi.image_url END
          ORDER BY pi.is_featured DESC, pi.sort_order ASC SEPARATOR '||')
        FROM product_images pi
        WHERE pi.product_id = p.id
      ) AS image_urls
    FROM products p
    JOIN product_categories c ON c.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND p.status = 'ACTIVE'
      AND p.slug <> 'sherise-9-count-organic-sanitary-pads'
    ORDER BY p.is_featured DESC, p.created_at DESC, p.id DESC
  `);

  return rows.map(productRowToProduct);
}

export async function loadCatalogProduct(slug: string): Promise<Product | undefined> {
  await ensureCatalogPackagingColumns();
  const rows = await queryRows<ProductRow>(
    `
      SELECT
        p.id,
        p.slug,
        p.name,
        p.short_description,
        p.description,
        c.name AS category_name,
        COALESCE((
          SELECT GROUP_CONCAT(pc.name ORDER BY pca.sort_order, pc.name SEPARATOR '||')
          FROM product_category_assignments pca
          JOIN product_categories pc ON pc.id = pca.category_id
          WHERE pca.product_id = p.id
        ), c.name) AS category_names,
        p.gst_percent,
      p.mrp,
        p.selling_price,
        p.discount_percent,
        p.sku,
        p.pack_quantity,
        p.flow_type,
        p.shipping_weight_g, p.package_length_cm, p.package_width_cm, p.package_height_cm,
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
          SELECT COALESCE(SUM(GREATEST(0, i.current_stock - i.reserved_stock)), 0)
          FROM inventory i
          WHERE i.product_id = p.id
        ) AS stock,
        (
          SELECT GROUP_CONCAT(
            CASE WHEN LEFT(pi.image_url, 11) = 'data:image/'
              THEN CONCAT('/api/catalog/product-image?id=', pi.id)
              ELSE pi.image_url END
            ORDER BY pi.is_featured DESC, pi.sort_order ASC SEPARATOR '||')
          FROM product_images pi
          WHERE pi.product_id = p.id
        ) AS image_urls
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND p.status = 'ACTIVE'
        AND p.slug <> 'sherise-9-count-organic-sanitary-pads'
        AND p.slug = ?
      LIMIT 1
    `,
    [slug],
  );

  return rows[0] ? productRowToProduct(rows[0]) : undefined;
}

let catalogSchemaReady: Promise<void> | undefined;
function ensureCatalogPackagingColumns() {
  catalogSchemaReady ??= prepareCatalogPackagingColumns().catch((error) => {
    catalogSchemaReady = undefined;
    throw error;
  });
  return catalogSchemaReady;
}

async function prepareCatalogPackagingColumns() {
  const columns: Array<[string, string]> = [
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
  const existingColumns = new Set(
    (await queryRows<RowDataPacket>("SHOW COLUMNS FROM products")).map((row) => row["Field"]),
  );
  for (const [column, definition] of columns) {
    if (existingColumns.has(column)) continue;
    try {
      await executeSql(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column|Duplicate column/i.test(message)) throw error;
    }
  }
  await executeSql(`
    CREATE TABLE IF NOT EXISTS product_category_assignments (
      product_id BIGINT UNSIGNED NOT NULL,
      category_id BIGINT UNSIGNED NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (product_id, category_id),
      KEY idx_product_category_assignments_category (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await executeSql(`
    INSERT IGNORE INTO product_category_assignments (product_id, category_id, sort_order)
    SELECT id, category_id, 0 FROM products WHERE category_id IS NOT NULL
  `);
}

function productRowToProduct(row: ProductRow): Product {
  const mrp = Number(row.mrp);
  const salePrice = Number(row.selling_price);
  const stock = Number(row.stock);
  const isComboOffer = /combo/i.test(`${row.slug} ${row.name} ${row.pack_quantity || ""}`);
  const packOptions = isComboOffer
    ? [
        { label: "7 Pads - 4 XXXL + 3 XXL", price: salePrice, mrp, stock },
        { label: "7 Pads - 4 XXL + 3 XXXL", price: salePrice, mrp, stock },
        {
          label: "20 Pads - 12 XXXL + 8 XXL",
          price: Math.round(salePrice * 2.55),
          mrp: Math.round(mrp * 2.5),
          stock,
        },
        {
          label: "20 Pads - 12 XXL + 8 XXXL",
          price: Math.round(salePrice * 2.55),
          mrp: Math.round(mrp * 2.5),
          stock,
        },
      ]
    : [
        {
          label: row.pack_quantity || "Default Pack",
          price: salePrice,
          mrp,
          stock,
        },
      ];
  return {
    id: String(row.id),
    gstPercent: Number(row.gst_percent || 0),
    shippingWeightG: row.shipping_weight_g == null ? null : Number(row.shipping_weight_g),
    packageLengthCm: row.package_length_cm == null ? null : Number(row.package_length_cm),
    packageWidthCm: row.package_width_cm == null ? null : Number(row.package_width_cm),
    packageHeightCm: row.package_height_cm == null ? null : Number(row.package_height_cm),
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description || row.name,
    description: row.description || row.short_description || row.name,
    category: row.category_name === "Period Care" ? "Period Care" : "Sanitary Pads",
    categories: (row.category_names || row.category_name || "").split("||").filter(Boolean),
    images: row.image_urls
      ? row.image_urls.split("||").map(normalizeImagePath).filter(Boolean)
      : [],
    sizes: isComboOffer ? ["XXL", "XXXL"] : ["XL", "XXL", "XXXL"],
    flow: row.flow_type
      ? row.flow_type
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : ["Medium"],
    packOptions,
    mrp,
    salePrice,
    discount: Number(row.discount_percent),
    stock,
    sku: row.sku,
    rating: 0,
    reviewCount: 0,
    features: jsonList(
      row.features,
      isComboOffer
        ? [
            "Mixed XXL and XXXL pads",
            "7-pack and 20-pack offers",
            "Choose the combination that suits your routine",
          ]
        : ["Connected from SheRise MySQL catalog"],
    ),
    materials: row.material_composition
      ? [row.material_composition]
      : ["Material details will be updated from product specifications."],
    usageInstructions: jsonList(row.usage_instructions, [
      "Follow the instructions provided on the product pack.",
    ]),
    disposalInstructions: jsonList(row.disposal_instructions, [
      "Wrap and dispose responsibly. Do not flush.",
    ]),
    faq: productInfoFaq(row),
    relatedProducts: [],
    featured: row.is_featured === 1,
  };
}

function productInfoFaq(row: ProductRow): Product["faq"] {
  const items: Product["faq"] = [];
  const packDetails = [row.front_pack_content, row.product_dimensions, row.pad_length]
    .filter(Boolean)
    .join("\n");
  if (packDetails) items.push({ q: "Pack content", a: packDetails });
  if (row.brand_message) items.push({ q: "SheRise brand message", a: row.brand_message });
  if (row.storage_instruction || row.shelf_life) {
    items.push({
      q: "Storage & best before",
      a: [row.storage_instruction, row.shelf_life ? `Best before: ${row.shelf_life}` : ""]
        .filter(Boolean)
        .join("\n"),
    });
  }
  const companyDetails = [
    row.manufacturer_details ? `Manufactured by: ${row.manufacturer_details}` : "",
    row.marketer_details ? `Marketed by: ${row.marketer_details}` : "",
    row.product_contact ? `Contact: ${row.product_contact}` : "",
    row.product_email ? `Email: ${row.product_email}` : "",
    row.product_website ? `Website: ${row.product_website}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  if (companyDetails) items.push({ q: "Product information", a: companyDetails });
  const safetyNotes = [row.safety_information, row.anion_strip_notes].filter(Boolean).join("\n\n");
  if (safetyNotes) items.push({ q: "Safety & packaging notes", a: safetyNotes });
  return items;
}

function jsonList(value: unknown, fallback: string[]): string[] {
  // mysql2 decodes JSON columns into arrays; older databases return JSON/text strings.
  if (Array.isArray(value)) {
    const items = value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : fallback;
  }
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return jsonList(parsed, fallback);
    if (typeof parsed !== "string") return fallback;
    value = parsed;
  } catch {
    // Older records may contain comma or newline separated text.
  }
  const items = String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function normalizeImagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const fallbackProductUploadImage = "/uploads/products/1790248547777-eabeac00-product.png";
  const fallbackFileName =
    trimmed.split(/[\\/]/).filter(Boolean).at(-1)?.toLowerCase() || trimmed.toLowerCase();
  if (fallbackFileName === "pad.jpg" || fallbackFileName === "product.jpg")
    return fallbackProductUploadImage;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }
  const fileName = trimmed.split(/[\\/]/).filter(Boolean).at(-1) || trimmed;
  return `/uploads/products/${fileName}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
