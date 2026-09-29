import type { RowDataPacket } from "mysql2/promise";

import type { Product } from "@/lib/catalog";

import { executeSql, queryRows } from "./mysql.server";

type ProductRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category_name: string | null;
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
  features: string | null;
  usage_instructions: string | null;
  disposal_instructions: string | null;
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

export async function handleCatalogRequest(): Promise<Response> {
  try {
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
      ) AS stock,
      (
        SELECT GROUP_CONCAT(pi.image_url ORDER BY pi.is_featured DESC, pi.sort_order ASC SEPARATOR '||')
        FROM product_images pi
        WHERE pi.product_id = p.id
      ) AS image_urls
    FROM products p
    JOIN product_categories c ON c.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND p.status = 'ACTIVE'
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
        ) AS stock,
        (
          SELECT GROUP_CONCAT(pi.image_url ORDER BY pi.is_featured DESC, pi.sort_order ASC SEPARATOR '||')
          FROM product_images pi
          WHERE pi.product_id = p.id
        ) AS image_urls
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      WHERE p.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND p.status = 'ACTIVE'
        AND p.slug = ?
      LIMIT 1
    `,
    [slug],
  );

  return rows[0] ? productRowToProduct(rows[0]) : undefined;
}

async function ensureCatalogPackagingColumns() {
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
  for (const [column, definition] of columns) {
    try {
      await executeSql(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column|Duplicate column/i.test(message)) throw error;
    }
  }
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
        { label: "20 Pads - 12 XXXL + 8 XXL", price: Math.round(salePrice * 2.55), mrp: Math.round(mrp * 2.5), stock },
        { label: "20 Pads - 12 XXL + 8 XXXL", price: Math.round(salePrice * 2.55), mrp: Math.round(mrp * 2.5), stock },
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
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description || row.name,
    description: row.description || row.short_description || row.name,
    category: row.category_name === "Period Care" ? "Period Care" : "Sanitary Pads",
    images: row.image_urls ? row.image_urls.split("||").map(normalizeImagePath).filter(Boolean) : [],
    sizes: isComboOffer ? ["XXL", "XXXL"] : ["XL", "XXL", "XXXL"],
    flow: row.flow_type ? row.flow_type.split(",").map((item) => item.trim()).filter(Boolean) : ["Medium"],
    packOptions,
    mrp,
    salePrice,
    discount: Number(row.discount_percent),
    stock,
    sku: row.sku,
    rating: 0,
    reviewCount: 0,
    features: jsonList(row.features, isComboOffer
      ? ["Mixed XXL and XXXL pads", "7-pack and 20-pack offers", "Choose the combination that suits your routine"]
      : ["Connected from SheRise MySQL catalog"]),
    materials: row.material_composition ? [row.material_composition] : ["Material details will be updated from product specifications."],
    usageInstructions: jsonList(row.usage_instructions, ["Follow the instructions provided on the product pack."]),
    disposalInstructions: jsonList(row.disposal_instructions, ["Wrap and dispose responsibly. Do not flush."]),
    faq: productInfoFaq(row),
    relatedProducts: [],
    featured: row.is_featured === 1,
  };
}

function productInfoFaq(row: ProductRow): Product["faq"] {
  const items: Product["faq"] = [];
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

function jsonList(value: string | null, fallback: string[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Ignore invalid JSON from older product records.
  }
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean) || fallback;
}

function normalizeImagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("blob:")) {
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
