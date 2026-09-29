import type { RowDataPacket } from "mysql2/promise";

import { infoTitles, policies } from "@/features/content-pages";
import { posts, products as frontendProducts } from "@/lib/catalog";
import type { CustomerOrder } from "@/lib/customer-types";
import { siteConfig } from "@/lib/site-config";

import { database } from "./database.server";
import { executeSql, queryRows } from "./mysql.server";
import { reviewStatus } from "./reviews.server";
import {
  deleteContentBlog,
  deleteContentFaq,
  listContentBlogs,
  listContentFaqs,
  upsertContentBlog,
  upsertContentFaq,
} from "./content.server";

type ModulePayload = {
  title: string;
  action: string;
  columns: string[];
  rows: string[][];
  metrics: Array<{ label: string; value: string; trend: string; tone: string }>;
  source: "mysql" | "frontend" | "sqlite";
};

type CategoryRow = RowDataPacket & {
  name: string;
  slug: string;
  display_in_navigation: number;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  status: string;
  product_count: number | string;
};

type ProductRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category_name: string;
  selling_price: number | string;
  mrp: number | string;
  flow_type: string | null;
  status: string;
  is_featured: number;
  stock: number | string;
  image_url: string | null;
};

type IdRow = RowDataPacket & {
  id: number;
};

type ProductEditRow = RowDataPacket & {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  mrp: number | string;
  selling_price: number | string;
  gst_percent: number | string;
  pack_quantity: string | null;
  flow_type: string | null;
  material_composition: string | null;
  product_dimensions: string | null;
  pad_length: string | null;
  front_pack_content: string | null;
  anion_strip_notes: string | null;
  brand_message: string | null;
  storage_instruction: string | null;
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
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  is_featured: number;
  is_bestseller: number;
  status: string;
  stock: number | string;
};

type BannerRow = RowDataPacket & {
  title: string;
  desktop_image_url: string;
  mobile_image_url: string | null;
  cta_text: string | null;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  sort_order: number;
  status: string;
};

type InventoryRow = RowDataPacket & {
  id: number;
  name: string;
  sku: string;
  pack_quantity: string | null;
  stock: number | string;
  low_stock_threshold: number | string | null;
  status: string;
};

type InventoryOverrideRow = {
  sku: string;
  stock: number;
  low_stock_threshold: number;
};

export async function handleAdminRequest(_request: Request, module: string): Promise<Response> {
  try {
    if (module === "products") await ensureProductPackagingColumns();
    if (_request.method === "POST" && module === "products") {
      const body = await readBody(_request);
      if (body["adminAction"] === "update") {
        await updateProduct(body);
      } else if (body["adminAction"] === "delete") {
        await deleteProduct(body);
      } else {
        await createProduct(body);
      }
      return json(await productsPayload(), 201);
    }
    if (_request.method === "POST" && module === "categories") {
      await createCategory(await readBody(_request));
      return json(await categoriesPayload(), 201);
    }
    if (_request.method === "POST" && module === "banners") {
      await createBanner(await readBody(_request));
      return json(await bannersPayload(), 201);
    }
    if (_request.method === "POST" && module === "orders") {
      await updateOrderStatus(await readBody(_request));
      return json(ordersPayload(), 200);
    }
    if (_request.method === "POST" && module === "reviews") {
      await updateReviewStatus(await readBody(_request));
      return json(reviewsPayload(), 200);
    }
    if (_request.method === "POST" && module === "inventory") {
      await updateInventoryStock(await readBody(_request));
      return json(await inventoryPayload(), 200);
    }
    if (_request.method === "POST" && module === "blogs") {
      const body = await readBody(_request);
      if (body["adminAction"] === "delete") deleteContentBlog(body);
      else upsertContentBlog(body);
      return json(blogsPayload(), 201);
    }
    if (_request.method === "POST" && module === "faqs") {
      const body = await readBody(_request);
      if (body["adminAction"] === "delete") deleteContentFaq(body);
      else upsertContentFaq(body);
      return json(faqsPayload(), 201);
    }
    if (_request.method !== "GET") return json({ error: "Method not allowed." }, 405);
    if (module === "products") return json(await productsPayload());
    if (module === "categories") return json(await categoriesPayload());
    if (module === "inventory") return json(await inventoryPayload());
    if (module === "orders") return json(ordersPayload());
    if (module === "customers") return json(customersPayload());
    if (module === "coupons") return json(couponsPayload());
    if (module === "reviews") return json(reviewsPayload());
    if (module === "homepage") return json(homepagePayload());
    if (module === "banners") return json(await bannersPayload());
    if (module === "popup-leads") return json(popupLeadsPayload());
    if (module === "newsletter") return json(newsletterPayload());
    if (module === "blogs") return json(blogsPayload());
    if (module === "faqs") return json(faqsPayload());
    if (module === "business-settings") return json(businessSettingsPayload());
    if (module === "shipping-settings") return json(shippingSettingsPayload());
    return json({ error: "Admin module is not connected yet." }, 404);
  } catch (error) {
    console.error("Admin MySQL API failed:", error instanceof Error ? error.message : error);
    return json(
      {
        error:
          "MySQL connection failed. Check MySQL is running and MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE are correct.",
      },
      500,
    );
  }
}

function updateOrderStatus(input: Record<string, unknown>) {
  const orderId = cleanText(input["orderId"], 64);
  const status = orderStatusValue(input["status"]);
  if (!orderId) throw new Error("Order id is required.");
  const row = database()
    .prepare("SELECT data FROM orders WHERE id=?")
    .get(orderId) as { data: string } | undefined;
  if (!row) throw new Error("Order not found.");
  const order = safeJson<CustomerOrder>(row.data);
  order.status = status;
  database().prepare("UPDATE orders SET data=? WHERE id=?").run(JSON.stringify(order), orderId);
}

function updateReviewStatus(input: Record<string, unknown>) {
  const orderId = cleanText(input["orderId"], 64);
  const productName = cleanText(input["productName"], 220);
  const nextStatus = reviewModerationStatus(input["status"]);
  if (!orderId || !productName) throw new Error("Review details are required.");
  const row = database()
    .prepare("SELECT data FROM orders WHERE id=?")
    .get(orderId) as { data: string } | undefined;
  if (!row) throw new Error("Order not found.");
  const order = safeJson<CustomerOrder>(row.data);
  const item = order.items.find((product) => product.name === productName);
  const review = order.reviews?.find((entry) => entry.slug === item?.slug);
  if (!review) throw new Error("Review not found.");
  review.status = nextStatus;
  review.moderatedAt = new Date().toISOString();
  database().prepare("UPDATE orders SET data=? WHERE id=?").run(JSON.stringify(order), orderId);
}

async function updateInventoryStock(input: Record<string, unknown>) {
  const sku = cleanText(input["sku"], 100).toUpperCase() || cleanText(input["code"], 100).toUpperCase();
  if (!sku) throw new Error("SKU is required.");
  const stock = Math.max(0, Number.parseInt(cleanText(input["stock"], 10) || "0", 10));
  const thresholdText = cleanText(input["lowStockThreshold"], 10);
  const threshold = thresholdText ? Math.max(0, Number.parseInt(thresholdText, 10)) : 5;
  try {
    const product = (
      await queryRows<IdRow>(
        "SELECT id FROM products WHERE sku = ? AND deleted_at IS NULL LIMIT 1",
        [sku],
      )
    )[0];
    if (!product) throw new Error("Product SKU not found.");

    const existing = (
      await queryRows<IdRow>(
        "SELECT id FROM inventory WHERE product_id = ? AND inventory_level = 'PRODUCT' LIMIT 1",
        [product.id],
      )
    )[0];

    if (existing) {
      await executeSql(
        "UPDATE inventory SET current_stock = ?, low_stock_threshold = ? WHERE id = ?",
        [stock, threshold, existing.id],
      );
    } else {
      await executeSql(
        "INSERT INTO inventory (product_id, variant_id, inventory_level, current_stock, reserved_stock, low_stock_threshold) VALUES (?, NULL, 'PRODUCT', ?, 0, ?)",
        [product.id, stock, threshold],
      );
    }
  } catch (error) {
    database()
      .prepare(
        `INSERT INTO inventory_overrides (sku, stock, low_stock_threshold, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(sku) DO UPDATE SET
           stock = excluded.stock,
           low_stock_threshold = excluded.low_stock_threshold,
           updated_at = excluded.updated_at`,
      )
      .run(sku, stock, threshold, new Date().toISOString());
  }
}

async function ensureProductPackagingColumns() {
  const columns: Array<[string, string]> = [
    ["product_dimensions", "VARCHAR(120) NULL"],
    ["pad_length", "VARCHAR(80) NULL"],
    ["front_pack_content", "TEXT NULL"],
    ["anion_strip_notes", "TEXT NULL"],
    ["brand_message", "TEXT NULL"],
    ["storage_instruction", "VARCHAR(200) NULL"],
    ["marketer_details", "TEXT NULL"],
    ["product_contact", "VARCHAR(80) NULL"],
    ["product_email", "VARCHAR(254) NULL"],
    ["product_website", "VARCHAR(200) NULL"],
    ["manufacturer_details", "TEXT NULL"],
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

function packagingSafetyText(input: Record<string, unknown>) {
  return [cleanText(input["safetyInformation"], 1000), cleanText(input["anionStripNotes"], 2000)]
    .filter(Boolean)
    .join("\n\n");
}

async function createProduct(input: Record<string, unknown>) {
  const name = cleanText(input["title"], 200);
  if (!name) throw new Error("Product name is required.");
  const slug = slugify(cleanText(input["slug"], 220) || name);
  const sku = (cleanText(input["sku"], 100) || `SR-${slug.slice(0, 24)}`).toUpperCase();
  const categoryId = await resolveCategoryId(cleanText(input["category"], 150));
  const mrp = moneyValue(input["mrp"]);
  const sellingPrice = moneyValue(input["sellingPrice"]);
  const discountPercent = mrp > 0 ? Math.max(0, Math.round((1 - sellingPrice / mrp) * 10000) / 100) : 0;
  const gstPercent = moneyValue(cleanText(input["gstPercent"], 16) || "0");
  const rawStatus = cleanText(input["status"], 20);
  const stock = rawStatus === "OUT OF STOCK" ? 0 : Math.max(0, Number.parseInt(cleanText(input["stock"], 8) || "0", 10));
  const packQuantity = cleanText(input["packQuantity"], 80) || null;
  const imageUrls = imageList(input["imageUrls"], cleanText(input["imageUrl"], 500) || `/uploads/products/${slug}.jpg`);
  const status = productStatusValue(rawStatus);
  const features = csvJson(input["features"]);
  const usage = csvJson(input["usageInstructions"]);
  const disposal = csvJson(input["disposalInstructions"]);
  const safetyInformation = packagingSafetyText(input);

  const productResult = await executeSql(
    `
      INSERT INTO products
        (
          category_id, name, slug, sku, short_description, description, mrp, selling_price,
          discount_amount, discount_percent, gst_percent, pack_quantity, flow_type,
          material_composition, product_dimensions, pad_length, front_pack_content,
          anion_strip_notes, brand_message, storage_instruction, features,
          usage_instructions, disposal_instructions, safety_information,
          manufacturer_details, marketer_details, product_contact, product_email,
          product_website, shelf_life, meta_title, meta_description, meta_keywords,
          is_featured, is_bestseller, status
        )
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      categoryId,
      name,
      slug,
      sku,
      cleanText(input["shortDescription"], 500) || null,
      cleanText(input["description"], 5000) || null,
      mrp,
      sellingPrice,
      Math.max(0, mrp - sellingPrice),
      discountPercent,
      gstPercent,
      packQuantity,
      flowSet(input["flow"]),
      cleanText(input["materials"], 1000) || null,
      cleanText(input["productDimensions"], 120) || null,
      cleanText(input["padLength"], 80) || null,
      cleanText(input["frontPackContent"], 2000) || null,
      cleanText(input["anionStripNotes"], 2000) || null,
      cleanText(input["brandMessage"], 2000) || null,
      cleanText(input["storageInstruction"], 200) || null,
      JSON.stringify(features),
      JSON.stringify(usage),
      JSON.stringify(disposal),
      safetyInformation || null,
      cleanText(input["manufacturerDetails"], 1000) || null,
      cleanText(input["marketerDetails"], 1000) || null,
      cleanText(input["productContact"], 80) || null,
      cleanText(input["productEmail"], 254) || null,
      cleanText(input["productWebsite"], 200) || null,
      cleanText(input["shelfLife"], 120) || null,
      cleanText(input["metaTitle"], 180) || name,
      cleanText(input["metaDescription"], 300) || cleanText(input["shortDescription"], 300) || null,
      cleanText(input["metaKeywords"], 300) || null,
      checkboxValue(input["isFeatured"]),
      checkboxValue(input["isBestseller"]),
      status,
    ],
  );

  const productId = productResult.insertId;
  await saveProductImages(productId, name, imageUrls);
  await executeSql(
    `
      INSERT INTO product_variants
        (product_id, sku, size, pack_quantity, variant_name, mrp, selling_price, discount_amount, discount_percent, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10)
    `,
    [
      productId,
      `${sku}-DEFAULT`,
      cleanText(input["sizes"], 50) || "XL",
      packQuantity,
      `${name} Default`,
      mrp,
      sellingPrice,
      Math.max(0, mrp - sellingPrice),
      discountPercent,
      status === "DRAFT" || status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    ],
  );
  await executeSql(
    `
      INSERT INTO inventory (product_id, variant_id, inventory_level, current_stock, low_stock_threshold)
      VALUES (?, NULL, 'PRODUCT', ?, ?)
    `,
    [productId, stock, Math.max(1, Number.parseInt(cleanText(input["lowStockThreshold"], 8) || "5", 10))],
  );
}

async function updateProduct(input: Record<string, unknown>) {
  const originalSku = cleanText(input["originalSku"], 100).toUpperCase();
  if (!originalSku) throw new Error("Product SKU is required.");
  const rows = await queryRows<ProductEditRow>(
    `
      SELECT
        p.id,
        p.category_id,
        p.name,
        p.slug,
        p.sku,
        p.short_description,
        p.description,
        p.mrp,
        p.selling_price,
        p.gst_percent,
        p.pack_quantity,
        p.flow_type,
        p.material_composition,
        p.product_dimensions,
        p.pad_length,
        p.front_pack_content,
        p.anion_strip_notes,
        p.brand_message,
        p.storage_instruction,
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
        p.meta_title,
        p.meta_description,
        p.meta_keywords,
        p.is_featured,
        p.is_bestseller,
        p.status,
        (
          SELECT COALESCE(SUM(i.current_stock), 0)
          FROM inventory i
          WHERE i.product_id = p.id
        ) AS stock
      FROM products p
      WHERE p.sku = ? AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [originalSku],
  );
  const existing = rows[0];
  if (!existing) throw new Error("Product not found.");
  const productId = existing.id;

  const name = cleanText(input["title"], 200) || existing.name;
  if (!name) throw new Error("Product name is required.");
  const slug = slugify(cleanText(input["slug"], 220) || existing.slug || name);
  const sku = (cleanText(input["sku"], 100) || existing.sku || originalSku).toUpperCase();
  const categoryText = cleanText(input["category"], 150);
  const categoryId = categoryText ? await resolveCategoryId(categoryText) : Number(existing.category_id);
  const mrp = optionalMoneyValue(input["mrp"], Number(existing.mrp));
  const sellingPrice = optionalMoneyValue(input["sellingPrice"], Number(existing.selling_price));
  const discountPercent = mrp > 0 ? Math.max(0, Math.round((1 - sellingPrice / mrp) * 10000) / 100) : 0;
  const gstPercent = optionalMoneyValue(input["gstPercent"], Number(existing.gst_percent || 0));
  const rawStatus = cleanText(input["status"], 20);
  const stockText = cleanText(input["stock"], 8);
  const stock = rawStatus === "OUT OF STOCK" ? 0 : stockText ? Math.max(0, Number.parseInt(stockText, 10)) : Number(existing.stock);
  const status = productStatusValue(rawStatus || existing.status);
  const imageUrl = cleanText(input["imageUrl"], 500);
  const imageUrls = imageList(input["imageUrls"], imageUrl);
  const shortDescription = cleanText(input["shortDescription"], 500) || existing.short_description;
  const description = cleanText(input["description"], 5000) || existing.description;
  const materials = cleanText(input["materials"], 1000) || existing.material_composition;
  const features = jsonListOrExisting(input["features"], existing.features);
  const usageInstructions = jsonListOrExisting(input["usageInstructions"], existing.usage_instructions);
  const disposalInstructions = jsonListOrExisting(input["disposalInstructions"], existing.disposal_instructions);
  const safetyInformation = packagingSafetyText(input) || existing.safety_information;
  const productDimensions = cleanText(input["productDimensions"], 120) || existing.product_dimensions;
  const padLength = cleanText(input["padLength"], 80) || existing.pad_length;
  const frontPackContent = cleanText(input["frontPackContent"], 2000) || existing.front_pack_content;
  const anionStripNotes = cleanText(input["anionStripNotes"], 2000) || existing.anion_strip_notes;
  const brandMessage = cleanText(input["brandMessage"], 2000) || existing.brand_message;
  const storageInstruction = cleanText(input["storageInstruction"], 200) || existing.storage_instruction;
  const manufacturerDetails = cleanText(input["manufacturerDetails"], 1000) || existing.manufacturer_details;
  const marketerDetails = cleanText(input["marketerDetails"], 1000) || existing.marketer_details;
  const productContact = cleanText(input["productContact"], 80) || existing.product_contact;
  const productEmail = cleanText(input["productEmail"], 254) || existing.product_email;
  const productWebsite = cleanText(input["productWebsite"], 200) || existing.product_website;
  const shelfLife = cleanText(input["shelfLife"], 120) || existing.shelf_life;
  const metaTitle = cleanText(input["metaTitle"], 180) || existing.meta_title || name;
  const metaDescription = cleanText(input["metaDescription"], 300) || existing.meta_description || shortDescription;
  const metaKeywords = cleanText(input["metaKeywords"], 300) || existing.meta_keywords;
  const packQuantity = cleanText(input["packQuantity"], 80) || existing.pack_quantity;
  const flowType = cleanText(input["flow"], 120) ? flowSet(input["flow"]) : existing.flow_type || "MEDIUM";

  await executeSql(
    `
      UPDATE products
      SET
        category_id = ?,
        name = ?,
        slug = ?,
        sku = ?,
        short_description = ?,
        description = ?,
        mrp = ?,
        selling_price = ?,
        discount_amount = ?,
        discount_percent = ?,
        gst_percent = ?,
        pack_quantity = ?,
        flow_type = ?,
        material_composition = ?,
        product_dimensions = ?,
        pad_length = ?,
        front_pack_content = ?,
        anion_strip_notes = ?,
        brand_message = ?,
        storage_instruction = ?,
        features = ?,
        usage_instructions = ?,
        disposal_instructions = ?,
        safety_information = ?,
        manufacturer_details = ?,
        marketer_details = ?,
        product_contact = ?,
        product_email = ?,
        product_website = ?,
        shelf_life = ?,
        meta_title = ?,
        meta_description = ?,
        meta_keywords = ?,
        is_featured = ?,
        is_bestseller = ?,
        status = ?
      WHERE id = ?
    `,
    [
      categoryId,
      name,
      slug,
      sku,
      shortDescription || null,
      description || null,
      mrp,
      sellingPrice,
      Math.max(0, mrp - sellingPrice),
      discountPercent,
      gstPercent,
      packQuantity || null,
      flowType,
      materials || null,
      productDimensions || null,
      padLength || null,
      frontPackContent || null,
      anionStripNotes || null,
      brandMessage || null,
      storageInstruction || null,
      features,
      usageInstructions,
      disposalInstructions,
      safetyInformation || null,
      manufacturerDetails || null,
      marketerDetails || null,
      productContact || null,
      productEmail || null,
      productWebsite || null,
      shelfLife || null,
      metaTitle,
      metaDescription || null,
      metaKeywords || null,
      cleanText(input["isFeatured"], 12) ? checkboxValue(input["isFeatured"]) : existing.is_featured,
      cleanText(input["isBestseller"], 12) ? checkboxValue(input["isBestseller"]) : existing.is_bestseller,
      status,
      productId,
    ],
  );

  await executeSql(
    `
      UPDATE inventory
      SET current_stock = ?
      WHERE product_id = ? AND inventory_level = 'PRODUCT'
    `,
    [stock, productId],
  );

  if (imageUrls.length > 0) await replaceProductImages(productId, name, imageUrls);
}

async function replaceProductImages(productId: number, name: string, imageUrls: string[]) {
  await executeSql("DELETE FROM product_images WHERE product_id = ?", [productId]);
  await saveProductImages(productId, name, imageUrls);
}

async function saveProductImages(productId: number, name: string, imageUrls: string[]) {
  for (const [index, imageUrl] of imageUrls.entries()) {
    const normalizedImageUrl = normalizeImagePath(imageUrl);
    if (!normalizedImageUrl) continue;
    await executeSql(
      `
        INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order, is_featured)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [productId, index === 0 ? "FEATURED" : "OTHER", normalizedImageUrl, name, (index + 1) * 10, index === 0 ? 1 : 0],
    );
  }
}

async function deleteProduct(input: Record<string, unknown>) {
  const originalSku = cleanText(input["originalSku"], 100).toUpperCase();
  if (!originalSku) throw new Error("Product SKU is required.");
  await executeSql("UPDATE products SET deleted_at = NOW(), status = 'INACTIVE' WHERE sku = ? AND deleted_at IS NULL", [
    originalSku,
  ]);
}

async function resolveCategoryId(category: string) {
  const categorySlug = slugify(category || "Sanitary Pads");
  const rows = await queryRows<IdRow>(
    "SELECT id FROM product_categories WHERE slug = ? OR name = ? LIMIT 1",
    [categorySlug, category],
  );
  if (rows[0]) return rows[0].id;
  const result = await executeSql(
    `
      INSERT INTO product_categories (name, slug, description, display_in_navigation, status, sort_order)
      SELECT ?, ?, 'Created from product form', 1, 'ACTIVE', COALESCE(MAX(sort_order), 0) + 10
      FROM product_categories
    `,
    [category || "Sanitary Pads", categorySlug],
  );
  return result.insertId;
}

async function createCategory(input: Record<string, unknown>) {
  const title = cleanText(input["title"], 150);
  if (!title) throw new Error("Category name is required.");
  const slug = slugify(cleanText(input["code"], 170) || title);
  const status = statusValue(input["status"]);
  const description = cleanText(input["notes"], 1000) || null;

  await executeSql(
    `
      INSERT INTO product_categories
        (name, slug, description, display_in_navigation, status, sort_order)
      SELECT ?, ?, ?, 1, ?, COALESCE(MAX(sort_order), 0) + 10
      FROM product_categories
    `,
    [title, slug, description, status],
  );
}

async function createBanner(input: Record<string, unknown>) {
  const title = cleanText(input["title"], 180);
  if (!title) throw new Error("Banner title is required.");
  const ctaText = cleanText(input["code"], 80) || null;
  const note = cleanText(input["notes"], 500);
  const desktopImageUrl = looksLikeUrl(note) ? note : `/images/${slugify(title)}.jpg`;
  const status = statusValue(input["status"]);

  await executeSql(
    `
      INSERT INTO homepage_banners
        (title, subtitle, desktop_image_url, cta_text, cta_url, status, sort_order)
      SELECT ?, ?, ?, ?, '/shop', ?, COALESCE(MAX(sort_order), 0) + 10
      FROM homepage_banners
    `,
    [title, note || null, desktopImageUrl, ctaText, status],
  );
}

async function productsPayload(): Promise<ModulePayload> {
  const rows = await queryRows<ProductRow>(`
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

  if (rows.length === 0) return frontendProductsPayload();

  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const draft = rows.filter((row) => row.status === "DRAFT").length;
  const lowStock = rows.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= 5).length;
  const outOfStock = rows.filter((row) => Number(row.stock) === 0).length;

  return {
    title: "Products",
    action: "Add Product",
    columns: ["Product", "Image", "SKU", "Category", "Price", "Stock", "Flow", "Status"],
    rows: rows.map((row) => [
      row.name,
      row.image_url ? normalizeImagePath(row.image_url) : "No Image",
      row.sku,
      row.category_name,
      `Rs.${Number(row.selling_price).toLocaleString("en-IN")}`,
      String(row.stock),
      row.flow_type || "-",
      row.status,
    ]),
    metrics: [
      { label: "Total Products", value: String(rows.length), trend: `${draft} draft`, tone: draft ? "warn" : "up" },
      { label: "Active Products", value: String(active), trend: "Store visible", tone: "up" },
      { label: "Low Stock", value: String(lowStock), trend: "Needs restock", tone: lowStock ? "warn" : "up" },
      { label: "Out of Stock", value: String(outOfStock), trend: outOfStock ? "Urgent" : "Clean", tone: outOfStock ? "danger" : "up" },
    ],
    source: "mysql",
  };
}

function frontendProductsPayload(): ModulePayload {
  const lowStock = frontendProducts.filter((product) => product.stock > 0 && product.stock <= 5).length;
  const outOfStock = frontendProducts.filter((product) => product.stock === 0).length;

  return {
    title: "Products",
    action: "Add Product",
    columns: ["Product", "Image", "SKU", "Category", "Price", "Stock", "Flow", "Status"],
    rows: frontendProducts.map((product) => [
      product.name,
      "Frontend asset",
      product.sku,
      product.category,
      `Rs.${product.salePrice.toLocaleString("en-IN")}`,
      String(product.stock),
      product.flow.join(","),
      product.stock === 0 ? "OUT OF STOCK" : "ACTIVE",
    ]),
    metrics: [
      { label: "Frontend Products", value: String(frontendProducts.length), trend: "Static catalog", tone: "neutral" },
      { label: "Featured", value: String(frontendProducts.filter((product) => product.featured).length), trend: "Visible on site", tone: "up" },
      { label: "Low Stock", value: String(lowStock), trend: "Needs restock", tone: lowStock ? "warn" : "up" },
      { label: "Out of Stock", value: String(outOfStock), trend: outOfStock ? "Urgent" : "Clean", tone: outOfStock ? "danger" : "up" },
    ],
    source: "frontend",
  };
}

async function inventoryPayload(): Promise<ModulePayload> {
  try {
    const rows = await queryRows<InventoryRow>(`
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

    if (rows.length) {
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
            row.name,
            row.sku,
            row.pack_quantity || "-",
            String(stock),
            stock === 0 ? "OUT OF STOCK" : stock <= threshold ? "LOW STOCK" : "ACTIVE",
          ];
        }),
        metrics: [
          { label: "SKUs", value: String(rows.length), trend: "Catalog items", tone: "neutral" },
          { label: "Current Stock", value: String(totalStock), trend: "Live MySQL stock", tone: "up" },
          { label: "Low Stock", value: String(lowStock.length), trend: "Needs restock", tone: lowStock.length ? "warn" : "up" },
          { label: "Out of Stock", value: String(outOfStock.length), trend: outOfStock.length ? "Urgent" : "Clean", tone: outOfStock.length ? "danger" : "up" },
        ],
        source: "mysql",
      };
    }
  } catch {
    // Fall through to the local preview inventory below when MySQL is unavailable.
  }

  const overrides = sqliteRows<InventoryOverrideRow>(
    "SELECT sku, stock, low_stock_threshold FROM inventory_overrides",
  );
  const overrideBySku = new Map(overrides.map((row) => [row.sku, row]));
  const inventoryProducts = frontendProducts.map((product) => {
    const override = overrideBySku.get(product.sku);
    return {
      ...product,
      stock: override ? Number(override.stock) : product.stock,
      lowStockThreshold: override ? Number(override.low_stock_threshold) : 5,
    };
  });
  const lowStock = inventoryProducts.filter((product) => product.stock > 0 && product.stock <= product.lowStockThreshold);
  const outOfStock = inventoryProducts.filter((product) => product.stock === 0);
  const totalStock = inventoryProducts.reduce((sum, product) => sum + product.stock, 0);

  return {
    title: "Inventory",
    action: "Stock Entry",
    columns: ["Item", "SKU", "Pack", "Stock", "Alert"],
    rows: inventoryProducts.map((product) => [
      product.name,
      product.sku,
      product.packOptions.map((pack) => pack.label).join(", "),
      String(product.stock),
      product.stock === 0 ? "OUT OF STOCK" : product.stock <= product.lowStockThreshold ? "LOW STOCK" : "ACTIVE",
    ]),
    metrics: [
      { label: "Frontend SKUs", value: String(inventoryProducts.length), trend: "Catalog items", tone: "neutral" },
      { label: "Current Stock", value: String(totalStock), trend: overrides.length ? "Local stock saved" : "Preview stock", tone: "up" },
      { label: "Low Stock", value: String(lowStock.length), trend: "Needs restock", tone: lowStock.length ? "warn" : "up" },
      { label: "Out of Stock", value: String(outOfStock.length), trend: outOfStock.length ? "Urgent" : "Clean", tone: outOfStock.length ? "danger" : "up" },
    ],
    source: overrides.length ? "sqlite" : "frontend",
  };
}

function ordersPayload(): ModulePayload {
  const orders = sqliteRows<{ id: string; user_id: string; data: string }>("SELECT id, user_id, data FROM orders ORDER BY rowid DESC");
  const rows = orders.map((row) => {
    const order = safeJson<{ total?: number; payment?: string; status?: string; items?: Array<{ name?: string; quantity?: number }> }>(row.data);
    return [
      row.id,
      row.user_id.slice(0, 8),
      order.items?.map((item) => `${item.name || "Item"} x${item.quantity || 1}`).join(", ") || "Preview order",
      `Rs.${Number(order.total || 0).toLocaleString("en-IN")}`,
      order.payment || "Preview",
      (order.status || "preview").toUpperCase(),
    ];
  });

  return {
    title: "Orders",
    action: "Create Order",
    columns: ["Order", "Customer", "Products", "Amount", "Payment", "Status"],
    rows: rows.length ? rows : [["No frontend orders yet", "Account DB", "Checkout preview saves here", "Rs.0", "Preview", "PENDING"]],
    metrics: [
      { label: "Preview Orders", value: String(rows.length), trend: "From frontend account DB", tone: rows.length ? "up" : "neutral" },
      { label: "Payments", value: "0", trend: "No real payment", tone: "neutral" },
      { label: "Shipping", value: "Off", trend: "Preview only", tone: "warn" },
      { label: "Cancellations", value: "0", trend: "Clean", tone: "up" },
    ],
    source: "sqlite",
  };
}

function customersPayload(): ModulePayload {
  const rows = sqliteRows<{ id: string; name: string; email: string; phone: string | null; whatsapp_number?: string; created_at: string }>(
    "SELECT id, name, email, phone, whatsapp_number, created_at FROM customers ORDER BY created_at DESC",
  );

  return {
    title: "Customers",
    action: "Add Customer",
    columns: ["Customer", "Email", "Mobile", "WhatsApp", "Created", "Status"],
    rows: rows.length
      ? rows.map((row) => [
          row.name,
          row.email,
          row.phone || "-",
          row.whatsapp_number || "-",
          row.created_at.slice(0, 10),
          "ACTIVE",
        ])
      : [["No frontend customers yet", "Register page", "Account DB", "-", "Pending", "PENDING"]],
    metrics: [
      { label: "Customers", value: String(rows.length), trend: "From frontend login/register", tone: rows.length ? "up" : "neutral" },
      { label: "Accounts", value: "Local", trend: "SQLite preview", tone: "neutral" },
      { label: "Blocked", value: "0", trend: "Clean", tone: "up" },
      { label: "Wishlist DB", value: "On", trend: "Frontend account", tone: "up" },
    ],
    source: "sqlite",
  };
}

function couponsPayload(): ModulePayload {
  return {
    title: "Coupons",
    action: "Create Coupon",
    columns: ["Code", "Type", "Value", "Frontend Use", "Status"],
    rows: [["RISE10", "Percentage", "10%", "Checkout demo coupon", "ACTIVE"]],
    metrics: [
      { label: "Frontend Coupons", value: "1", trend: "RISE10 active", tone: "up" },
      { label: "Checkout", value: "Connected", trend: "Applies 10%", tone: "up" },
      { label: "Real Billing", value: "Off", trend: "Preview only", tone: "warn" },
      { label: "Expired", value: "0", trend: "Clean", tone: "up" },
    ],
    source: "frontend",
  };
}

function reviewsPayload(): ModulePayload {
  const orders = sqliteRows<{ id: string; user_id: string; data: string }>("SELECT id, user_id, data FROM orders ORDER BY rowid DESC");
  const submittedReviews = orders.flatMap((row) => {
    const order = safeJson<CustomerOrder>(row.data);
    return (order.reviews ?? []).map((review) => {
      const item = order.items?.find((product) => product.slug === review.slug);
      return [
        row.user_id.slice(0, 8),
        item?.name || review.slug,
        `${review.rating}/5 - ${review.reviewText.slice(0, 80)}`,
        reviewStatus(review),
        row.id,
      ];
    });
  });
  const pendingCount = submittedReviews.filter((row) => row[3] === "PENDING").length;
  const approvedCount = submittedReviews.filter((row) => row[3] === "APPROVED").length;

  return {
    title: "Reviews",
    action: "Moderate",
    columns: ["Surface", "Product", "Frontend Text", "Status", "Action"],
    rows: submittedReviews.length
      ? submittedReviews
      : frontendProducts.map((product) => [
          "Product Detail",
          product.name,
          "No customer reviews yet",
          product.stock === 0 ? "INACTIVE" : "ACTIVE",
          "Publish verified reviews after launch",
        ]),
    metrics: [
      { label: "Submitted Reviews", value: String(submittedReviews.length), trend: "From delivered orders", tone: submittedReviews.length ? "warn" : "neutral" },
      { label: "Products", value: String(frontendProducts.length), trend: "Review surfaces", tone: "up" },
      { label: "Pending", value: String(pendingCount), trend: pendingCount ? "Moderate" : "Clean", tone: pendingCount ? "warn" : "up" },
      { label: "Approved", value: String(approvedCount), trend: "Shown on website", tone: approvedCount ? "up" : "neutral" },
    ],
    source: "frontend",
  };
}

function homepagePayload(): ModulePayload {
  const sections = [
    ["Hero", "HERO", "SHOP NOW", "Rise above every period.", "ACTIVE"],
    ["Brand Ribbon", "PROMOTIONAL", "-", "Release. Renew & Rise.", "ACTIVE"],
    ["Category Tiles", "CATEGORIES", "Category links", "Sanitary Pads, Period Care, Combos", "ACTIVE"],
    ["Everyday Edit", "FEATURED_PRODUCTS", "SHOP ALL ESSENTIALS", "First 4 frontend products", "ACTIVE"],
    ["Flow Finder", "BENEFITS", "Flow filters", "Light, Medium, Heavy, Overnight", "ACTIVE"],
    ["Editorial Story", "CUSTOM", "OUR STORY", "Your period shouldn't pause your life.", "ACTIVE"],
    ["Blog Strip", "BLOGS", "Blog detail links", `${posts.length} frontend posts`, "ACTIVE"],
    ["Newsletter", "CTA", "JOIN US", "Saves signups to admin", "ACTIVE"],
  ];

  return {
    title: "Homepage Sections",
    action: "Add Section",
    columns: ["Section", "Type", "CTA", "Frontend Content", "Status"],
    rows: sections,
    metrics: [
      { label: "Frontend Sections", value: String(sections.length), trend: "From home page", tone: "up" },
      { label: "Hero Live", value: "1", trend: "Static asset", tone: "up" },
      { label: "Product Blocks", value: "1", trend: "First 4 products", tone: "up" },
      { label: "Newsletter", value: "Connected", trend: "Admin signup storage", tone: "up" },
    ],
    source: "frontend",
  };
}

function popupLeadsPayload(): ModulePayload {
  const leads = sqliteRows<{ id: string; data: string; created_at: string }>(
    "SELECT id, data, created_at FROM popup_leads ORDER BY created_at DESC",
  );
  const rows = leads.map((row) => {
    const lead = safeJson<{
      name?: string;
      mobile?: string;
      email?: string;
      interestedIn?: string;
      message?: string;
      source?: string;
      createdAt?: string;
    }>(row.data);
    return [
      lead.name || "Website visitor",
      lead.mobile || "-",
      lead.email || "-",
      lead.interestedIn || "Sanitary Pads",
      lead.message || "-",
      (lead.createdAt || row.created_at).slice(0, 10),
      "NEW",
    ];
  });

  return {
    title: "Pop-up Leads",
    action: "Add Lead",
    columns: ["Name", "Mobile", "Email", "Interested In", "Message", "Date", "Status"],
    rows: rows.length
      ? rows
      : [["No popup leads yet", "Website popup", "Submit enquiry form", "Pending", "-", "-", "PENDING"]],
    metrics: [
      { label: "Persisted Leads", value: String(rows.length), trend: rows.length ? "Stored in SQLite" : "Waiting for submissions", tone: rows.length ? "up" : "neutral" },
      { label: "New Leads", value: String(rows.length), trend: "Popup enquiries", tone: rows.length ? "warn" : "neutral" },
      { label: "Source", value: "Popup", trend: "Website open modal", tone: "up" },
      { label: "Storage", value: "On", trend: "Admin visible", tone: "up" },
    ],
    source: "sqlite",
  };
}

function newsletterPayload(): ModulePayload {
  const subscribers = sqliteRows<{
    id: string;
    email: string;
    source: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>(
    "SELECT id, email, source, status, created_at, updated_at FROM newsletter_subscribers ORDER BY updated_at DESC",
  );
  const active = subscribers.filter((subscriber) => subscriber.status === "ACTIVE").length;
  const rows = subscribers.map((subscriber) => [
    subscriber.email,
    subscriber.source || "Website newsletter",
    subscriber.created_at.slice(0, 10),
    subscriber.updated_at.slice(0, 10),
    subscriber.status || "ACTIVE",
  ]);

  return {
    title: "Newsletter Subscribers",
    action: "Add Subscriber",
    columns: ["Email", "Source", "Subscribed", "Updated", "Status"],
    rows: rows.length
      ? rows
      : [["No newsletter signups yet", "Footer newsletter", "Waiting", "Waiting", "PENDING"]],
    metrics: [
      { label: "Subscribers", value: String(subscribers.length), trend: "Stored in SQLite", tone: subscribers.length ? "up" : "neutral" },
      { label: "Active", value: String(active), trend: "Newsletter list", tone: active ? "up" : "neutral" },
      { label: "Source", value: "Website", trend: "JOIN US form", tone: "up" },
      { label: "Storage", value: "On", trend: "Admin visible", tone: "up" },
    ],
    source: "sqlite",
  };
}

function blogsPayload(): ModulePayload {
  const contentPosts = listContentBlogs({ includeInactive: true });
  return {
    title: "Blogs",
    action: "Add Blog",
    columns: ["Title", "Slug", "Category", "Published", "Author", "Image", "Excerpt", "Status"],
    rows: contentPosts.map((post) => [
      post.title,
      post.slug,
      post.category,
      post.date,
      "SheRise Team",
      post.image,
      post.excerpt,
      "ACTIVE",
    ]),
    metrics: [
      { label: "Frontend Posts", value: String(contentPosts.length), trend: "Blog listing", tone: "up" },
      { label: "Categories", value: String(new Set(contentPosts.map((post) => post.category)).size), trend: "Editorial", tone: "up" },
      { label: "Drafts", value: "0", trend: "Clean", tone: "up" },
      { label: "Author", value: "SheRise", trend: "Preview editorial", tone: "neutral" },
    ],
    source: "sqlite",
  };
}

function faqsPayload(): ModulePayload {
  const contentFaqs = listContentFaqs({ includeInactive: true });
  const policyFaqs = Object.entries(policies).flatMap(([key, items]) =>
    items.map((item) => ({ ...item, category: infoTitles[key] || key })),
  );
  const rows = [
    ...contentFaqs.map((item) => [item.q, item.a.slice(0, 80), "ACTIVE"]),
    ...policyFaqs.map((item) => [item.q, item.a.slice(0, 80), "ACTIVE"]),
  ];

  return {
    title: "FAQs",
    action: "Add FAQ",
    columns: ["Question", "Answer Preview", "Status"],
    rows,
    metrics: [
      { label: "Frontend FAQs", value: String(rows.length), trend: "FAQ + policy accordions", tone: "up" },
      { label: "FAQ Page", value: String(contentFaqs.length), trend: "Public FAQ", tone: "up" },
      { label: "Policies", value: String(policyFaqs.length), trend: "Public policy pages", tone: "neutral" },
      { label: "Drafts", value: "0", trend: "Clean", tone: "up" },
    ],
    source: "sqlite",
  };
}

function businessSettingsPayload(): ModulePayload {
  return {
    title: "Business Settings",
    action: "Update Business",
    columns: ["Setting", "Frontend Value", "Where Used", "Status"],
    rows: [
      ["Brand Name", "SheRise", "Header, footer, SEO", "ACTIVE"],
      ["Instagram", siteConfig.instagramUrl || "Not set", "Footer/social links", siteConfig.instagramUrl ? "ACTIVE" : "PENDING"],
      ["Facebook", siteConfig.facebookUrl || "Not set", "Footer/social links", siteConfig.facebookUrl ? "ACTIVE" : "PENDING"],
      ["Support Email", siteConfig.supportEmail || "Not set", "Support/contact copy", siteConfig.supportEmail ? "ACTIVE" : "PENDING"],
      ["Demo Mode", siteConfig.demoMode ? "On" : "Off", "Preview messaging", "ACTIVE"],
    ],
    metrics: [
      { label: "Brand", value: "SheRise", trend: "Frontend active", tone: "up" },
      { label: "Demo Mode", value: siteConfig.demoMode ? "On" : "Off", trend: "Preview site", tone: siteConfig.demoMode ? "warn" : "up" },
      { label: "Social Links", value: String([siteConfig.instagramUrl, siteConfig.facebookUrl].filter(Boolean).length), trend: "Configured", tone: "neutral" },
      { label: "Support Email", value: siteConfig.supportEmail ? "Set" : "Missing", trend: "Before launch", tone: siteConfig.supportEmail ? "up" : "warn" },
    ],
    source: "frontend",
  };
}

function shippingSettingsPayload(): ModulePayload {
  const shippingPolicy = policies["shipping-policy"] || [];
  return {
    title: "Shipping Settings",
    action: "Add Rule",
    columns: ["Rule", "Frontend Text", "Checkout Value", "Status"],
    rows: [
      ["Standard shipping", "Checkout calculates shipping", "Rs.40 / free above Rs.499", "ACTIVE"],
      ...shippingPolicy.map((item) => [item.q, item.a.slice(0, 90), "Policy page", "PENDING"]),
      ["PIN check", "Product page validates PIN format only", "No coverage check", "PENDING"],
    ],
    metrics: [
      { label: "Checkout Shipping", value: "Rs.40", trend: "Free above Rs.499", tone: "warn" },
      { label: "Coverage", value: "Pending", trend: "Policy says not active", tone: "warn" },
      { label: "PIN Check", value: "Format", trend: "No courier API", tone: "neutral" },
      { label: "Rules", value: String(shippingPolicy.length + 2), trend: "Frontend surfaces", tone: "neutral" },
    ],
    source: "frontend",
  };
}

async function categoriesPayload(): Promise<ModulePayload> {
  const rows = await queryRows<CategoryRow>(`
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
  const visible = rows.filter((row) => row.display_in_navigation === 1).length;
  const seoMissing = rows.filter((row) => !row.seo_title || !row.seo_description).length;

  return {
    title: "Categories",
    action: "Add Category",
    columns: ["Category", "Slug", "Products", "Navigation", "SEO", "Sort", "Status"],
    rows: rows.map((row) => [
      row.name,
      row.slug,
      String(row.product_count),
      row.display_in_navigation === 1 ? "Shown" : "Hidden",
      row.seo_title && row.seo_description ? "Ready" : "Needs Meta",
      String(row.sort_order),
      row.status,
    ]),
    metrics: [
      { label: "Categories", value: String(rows.length), trend: `${active} active`, tone: "up" },
      { label: "Menu Items", value: String(visible), trend: "Visible", tone: "neutral" },
      {
        label: "SEO Missing",
        value: String(seoMissing),
        trend: seoMissing ? "Review" : "Clean",
        tone: seoMissing ? "warn" : "up",
      },
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

async function bannersPayload(): Promise<ModulePayload> {
  const rows = await queryRows<BannerRow>(`
    SELECT
      title,
      desktop_image_url,
      mobile_image_url,
      cta_text,
      starts_at,
      ends_at,
      sort_order,
      status
    FROM homepage_banners
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, id ASC
  `);

  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const scheduled = rows.filter((row) => row.starts_at || row.ends_at).length;
  const mobileImages = rows.filter((row) => row.mobile_image_url).length;
  const missingCta = rows.filter((row) => !row.cta_text).length;

  return {
    title: "Homepage Banners",
    action: "Add Banner",
    columns: ["Banner", "Desktop Image", "Mobile Image", "CTA", "Schedule", "Sort", "Status"],
    rows: rows.map((row) => [
      row.title,
      basename(row.desktop_image_url),
      row.mobile_image_url ? basename(row.mobile_image_url) : "Not Set",
      row.cta_text || "-",
      scheduleLabel(row.starts_at, row.ends_at),
      String(row.sort_order),
      row.status,
    ]),
    metrics: [
      { label: "Total Banners", value: String(rows.length), trend: `${active} active`, tone: "up" },
      {
        label: "Scheduled",
        value: String(scheduled),
        trend: scheduled ? "Date based" : "Always on",
        tone: scheduled ? "warn" : "up",
      },
      {
        label: "Mobile Images",
        value: `${mobileImages}/${rows.length}`,
        trend: mobileImages === rows.length ? "Complete" : "Missing",
        tone: mobileImages === rows.length ? "up" : "warn",
      },
      {
        label: "Missing CTA",
        value: String(missingCta),
        trend: missingCta ? "Add CTA" : "Clean",
        tone: missingCta ? "warn" : "up",
      },
    ],
    source: "mysql",
  };
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

function sqliteRows<T>(sql: string) {
  try {
    return database().prepare(sql).all() as T[];
  } catch {
    return [];
  }
}

function safeJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
}

async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Use a JSON request.");
  }
  return (await request.json()) as Record<string, unknown>;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function statusValue(value: unknown) {
  return String(value) === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

function productStatusValue(value: unknown) {
  const status = String(value);
  return status === "INACTIVE" || status === "DRAFT" ? status : "ACTIVE";
}

function orderStatusValue(value: unknown): CustomerOrder["status"] {
  const status = String(value).toLowerCase();
  if (status === "packed" || status === "shipped" || status === "delivered" || status === "cancelled") {
    return status;
  }
  return "preview";
}

function reviewModerationStatus(value: unknown): NonNullable<CustomerOrder["reviews"]>[number]["status"] {
  const status = String(value).toUpperCase();
  return status === "APPROVED" || status === "REJECTED" ? status : "PENDING";
}

function moneyValue(value: unknown) {
  const parsed = Number.parseFloat(cleanText(value, 16) || "0");
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function optionalMoneyValue(value: unknown, fallback: number) {
  const text = cleanText(value, 16);
  if (!text) return Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
  return moneyValue(text);
}

function csvJson(value: unknown) {
  return cleanText(value, 2000)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function jsonListOrExisting(value: unknown, fallback: string | null) {
  const items = csvJson(value);
  return items.length ? JSON.stringify(items) : fallback || JSON.stringify([]);
}

function imageList(value: unknown, fallback: string) {
  const images = cleanText(value, 5000)
    .split(/\r?\n|,/)
    .map((item) => cleanText(item, 500))
    .filter(Boolean);
  const normalizedFallback = cleanText(fallback, 500);
  const list = normalizedFallback ? [normalizedFallback, ...images] : images;
  return list.filter((item, index) => list.indexOf(item) === index);
}

function checkboxValue(value: unknown) {
  return value === true || value === "true" || value === "on" || value === "1" ? 1 : 0;
}

function flowSet(value: unknown) {
  const allowed = new Set(["LIGHT", "MEDIUM", "HEAVY", "OVERNIGHT"]);
  const values = cleanText(value, 120)
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => allowed.has(item));
  return values.length ? values.join(",") : "MEDIUM";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 170);
}

function looksLikeUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

function basename(value: string) {
  return value.split("/").filter(Boolean).at(-1) || value;
}

function normalizeImagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  return `/uploads/products/${basename(trimmed)}`;
}

function scheduleLabel(startsAt: Date | string | null, endsAt: Date | string | null) {
  if (!startsAt && !endsAt) return "Always On";
  if (startsAt && endsAt) return `${formatDate(startsAt)} to ${formatDate(endsAt)}`;
  if (startsAt) return `Starts ${formatDate(startsAt)}`;
  return `Ends ${formatDate(endsAt)}`;
}

function formatDate(value: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}
