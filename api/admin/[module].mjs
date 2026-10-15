import { createPool } from "mysql2/promise";

import { assertAdminRequest } from "../_admin-session.mjs";
import { ordersPayload, updateOrderStatus } from "../_admin-orders.mjs";

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

  try {
    assertAdminRequest(req);

    const moduleName = Array.isArray(req.query.module) ? req.query.module[0] : req.query.module;
    if (req.method === "POST" && moduleName === "orders") {
      await updateOrderStatus(orderTransaction, await readJsonBody(req));
      res.status(200).json(await ordersPayload(queryRows));
      return;
    }
    if (req.method === "POST" && moduleName === "products") {
      await ensureProductSchema();
      const body = await readJsonBody(req);
      if (body.adminAction === "update") {
        await updateProduct(body);
      } else if (body.adminAction === "delete") {
        await deleteProduct(body);
      } else {
        await createProduct(body);
      }
      res.status(201).json(await productsPayload());
      return;
    }
    if (req.method === "POST" && moduleName === "inventory") {
      const body = await readJsonBody(req);
      await updateInventoryStock(body);
      res.status(200).json(await inventoryPayload());
      return;
    }
    if (req.method === "POST" && moduleName === "coupons") {
      const body = await readJsonBody(req);
      if (body.adminAction === "update") {
        await updateCoupon(body);
      } else if (body.adminAction === "delete") {
        await deleteCoupon(body);
      } else {
        await createCoupon(body);
      }
      res.status(200).json(await couponsPayload());
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    if (moduleName === "products") {
      await ensureProductSchema();
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
    if (moduleName === "customers") {
      res.status(200).json(await customersPayload());
      return;
    }
    if (moduleName === "orders") {
      res.status(200).json(await ordersPayload(queryRows));
      return;
    }
    if (moduleName === "coupons") {
      res.status(200).json(await couponsPayload());
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
          : [400, 404].includes(statusCode)
          ? error.message
          : "MySQL connection failed. Check production environment variables and database access.",
    });
  }
}

async function orderTransaction(work) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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

async function ensureProductSchema() {
  const productColumns = [
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

  for (const [column, definition] of productColumns) {
    try {
      await executeSql(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!/duplicate column|Duplicate column/i.test(String(error?.message || error))) throw error;
    }
  }

  await executeSql("ALTER TABLE product_images MODIFY image_url LONGTEXT NOT NULL");
}

async function createProduct(input) {
  const name = cleanText(input.title, 200);
  if (!name) throw new Error("Product name is required.");
  const slug = slugify(cleanText(input.slug, 220) || name);
  const sku = (cleanText(input.sku, 100) || `SR-${slug.slice(0, 24)}`).toUpperCase();
  const categoryId = await resolveCategoryId(cleanText(input.category, 150));
  const mrp = moneyValue(input.mrp);
  const sellingPrice = moneyValue(input.sellingPrice);
  const discountPercent = mrp > 0 ? Math.max(0, Math.round((1 - sellingPrice / mrp) * 10000) / 100) : 0;
  const gstPercent = moneyValue(cleanText(input.gstPercent, 16) || "0");
  const rawStatus = cleanText(input.status, 20);
  const stock = rawStatus === "OUT OF STOCK" ? 0 : Math.max(0, Number.parseInt(cleanText(input.stock, 8) || "0", 10));
  const packQuantity = cleanText(input.packQuantity, 80) || null;
  const imageUrls = imageList(input.imageUrls, cleanImageText(input.imageUrl) || `/uploads/products/${slug}.jpg`);
  const status = productStatusValue(rawStatus);
  const features = csvJson(input.features);
  const usage = csvJson(input.usageInstructions);
  const disposal = csvJson(input.disposalInstructions);
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
      cleanText(input.shortDescription, 500) || null,
      cleanText(input.description, 5000) || null,
      mrp,
      sellingPrice,
      Math.max(0, mrp - sellingPrice),
      discountPercent,
      gstPercent,
      packQuantity,
      flowSet(input.flow),
      cleanText(input.materials, 1000) || null,
      cleanText(input.productDimensions, 120) || null,
      cleanText(input.padLength, 80) || null,
      cleanText(input.frontPackContent, 2000) || null,
      cleanText(input.anionStripNotes, 2000) || null,
      cleanText(input.brandMessage, 2000) || null,
      cleanText(input.storageInstruction, 200) || null,
      JSON.stringify(features),
      JSON.stringify(usage),
      JSON.stringify(disposal),
      safetyInformation || null,
      cleanText(input.manufacturerDetails, 1000) || null,
      cleanText(input.marketerDetails, 1000) || null,
      cleanText(input.productContact, 80) || null,
      cleanText(input.productEmail, 254) || null,
      cleanText(input.productWebsite, 200) || null,
      cleanText(input.shelfLife, 120) || null,
      cleanText(input.metaTitle, 180) || name,
      cleanText(input.metaDescription, 300) || cleanText(input.shortDescription, 300) || null,
      cleanText(input.metaKeywords, 300) || null,
      checkboxValue(input.isFeatured),
      checkboxValue(input.isBestseller),
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
      cleanText(input.sizes, 50) || "XL",
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
    [productId, stock, Math.max(1, Number.parseInt(cleanText(input.lowStockThreshold, 8) || "5", 10))],
  );
}

async function updateProduct(input) {
  const originalSku = cleanText(input.originalSku, 100).toUpperCase();
  if (!originalSku) throw new Error("Product SKU is required.");
  const existing = (
    await queryRows(
      `
        SELECT
          p.id, p.category_id, p.name, p.slug, p.sku, p.short_description, p.description,
          p.mrp, p.selling_price, p.gst_percent, p.pack_quantity, p.flow_type,
          p.material_composition, p.product_dimensions, p.pad_length, p.front_pack_content,
          p.anion_strip_notes, p.brand_message, p.storage_instruction, p.features,
          p.usage_instructions, p.disposal_instructions, p.safety_information,
          p.manufacturer_details, p.marketer_details, p.product_contact, p.product_email,
          p.product_website, p.shelf_life, p.meta_title, p.meta_description, p.meta_keywords,
          p.is_featured, p.is_bestseller, p.status,
          (SELECT COALESCE(SUM(i.current_stock), 0) FROM inventory i WHERE i.product_id = p.id) AS stock
        FROM products p
        WHERE p.sku = ? AND p.deleted_at IS NULL
        LIMIT 1
      `,
      [originalSku],
    )
  )[0];
  if (!existing) throw new Error("Product not found.");

  const productId = existing.id;
  const name = cleanText(input.title, 200) || existing.name;
  const slug = slugify(cleanText(input.slug, 220) || existing.slug || name);
  const sku = (cleanText(input.sku, 100) || existing.sku || originalSku).toUpperCase();
  const categoryText = cleanText(input.category, 150);
  const categoryId = categoryText ? await resolveCategoryId(categoryText) : Number(existing.category_id);
  const mrp = optionalMoneyValue(input.mrp, Number(existing.mrp));
  const sellingPrice = optionalMoneyValue(input.sellingPrice, Number(existing.selling_price));
  const discountPercent = mrp > 0 ? Math.max(0, Math.round((1 - sellingPrice / mrp) * 10000) / 100) : 0;
  const gstPercent = optionalMoneyValue(input.gstPercent, Number(existing.gst_percent || 0));
  const rawStatus = cleanText(input.status, 20);
  const stockText = cleanText(input.stock, 8);
  const stock = rawStatus === "OUT OF STOCK" ? 0 : stockText ? Math.max(0, Number.parseInt(stockText, 10)) : Number(existing.stock);
  const status = productStatusValue(rawStatus || existing.status);
  const imageUrls = imageList(input.imageUrls, cleanImageText(input.imageUrl));
  const shortDescription = cleanText(input.shortDescription, 500) || existing.short_description;
  const description = cleanText(input.description, 5000) || existing.description;
  const materials = cleanText(input.materials, 1000) || existing.material_composition;
  const features = jsonListOrExisting(input.features, existing.features);
  const usageInstructions = jsonListOrExisting(input.usageInstructions, existing.usage_instructions);
  const disposalInstructions = jsonListOrExisting(input.disposalInstructions, existing.disposal_instructions);
  const safetyInformation = packagingSafetyText(input) || existing.safety_information;
  const productDimensions = cleanText(input.productDimensions, 120) || existing.product_dimensions;
  const padLength = cleanText(input.padLength, 80) || existing.pad_length;
  const frontPackContent = cleanText(input.frontPackContent, 2000) || existing.front_pack_content;
  const anionStripNotes = cleanText(input.anionStripNotes, 2000) || existing.anion_strip_notes;
  const brandMessage = cleanText(input.brandMessage, 2000) || existing.brand_message;
  const storageInstruction = cleanText(input.storageInstruction, 200) || existing.storage_instruction;
  const manufacturerDetails = cleanText(input.manufacturerDetails, 1000) || existing.manufacturer_details;
  const marketerDetails = cleanText(input.marketerDetails, 1000) || existing.marketer_details;
  const productContact = cleanText(input.productContact, 80) || existing.product_contact;
  const productEmail = cleanText(input.productEmail, 254) || existing.product_email;
  const productWebsite = cleanText(input.productWebsite, 200) || existing.product_website;
  const shelfLife = cleanText(input.shelfLife, 120) || existing.shelf_life;
  const metaTitle = cleanText(input.metaTitle, 180) || existing.meta_title || name;
  const metaDescription = cleanText(input.metaDescription, 300) || existing.meta_description || shortDescription;
  const metaKeywords = cleanText(input.metaKeywords, 300) || existing.meta_keywords;
  const packQuantity = cleanText(input.packQuantity, 80) || existing.pack_quantity;
  const flowType = cleanText(input.flow, 120) ? flowSet(input.flow) : existing.flow_type || "MEDIUM";

  await executeSql(
    `
      UPDATE products
      SET
        category_id = ?, name = ?, slug = ?, sku = ?, short_description = ?, description = ?,
        mrp = ?, selling_price = ?, discount_amount = ?, discount_percent = ?, gst_percent = ?,
        pack_quantity = ?, flow_type = ?, material_composition = ?, product_dimensions = ?,
        pad_length = ?, front_pack_content = ?, anion_strip_notes = ?, brand_message = ?,
        storage_instruction = ?, features = ?, usage_instructions = ?, disposal_instructions = ?,
        safety_information = ?, manufacturer_details = ?, marketer_details = ?, product_contact = ?,
        product_email = ?, product_website = ?, shelf_life = ?, meta_title = ?, meta_description = ?,
        meta_keywords = ?, is_featured = ?, is_bestseller = ?, status = ?
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
      cleanText(input.isFeatured, 12) ? checkboxValue(input.isFeatured) : existing.is_featured,
      cleanText(input.isBestseller, 12) ? checkboxValue(input.isBestseller) : existing.is_bestseller,
      status,
      productId,
    ],
  );

  await executeSql(
    "UPDATE inventory SET current_stock = ? WHERE product_id = ? AND inventory_level = 'PRODUCT'",
    [stock, productId],
  );
  if (imageUrls.length > 0) await replaceProductImages(productId, name, imageUrls);
}

async function deleteProduct(input) {
  const originalSku = cleanText(input.originalSku, 100).toUpperCase();
  if (!originalSku) throw new Error("Product SKU is required.");
  await executeSql("UPDATE products SET deleted_at = NOW(), status = 'INACTIVE' WHERE sku = ? AND deleted_at IS NULL", [originalSku]);
}

async function updateInventoryStock(input) {
  const sku = (cleanText(input.sku, 100) || cleanText(input.code, 100)).toUpperCase();
  if (!sku) throw new Error("SKU is required.");
  const stock = Math.max(0, Number.parseInt(cleanText(input.stock, 10) || "0", 10));
  const thresholdText = cleanText(input.lowStockThreshold, 10);
  const threshold = thresholdText ? Math.max(0, Number.parseInt(thresholdText, 10)) : 5;
  const product = (
    await queryRows("SELECT id FROM products WHERE sku = ? AND deleted_at IS NULL LIMIT 1", [sku])
  )[0];
  if (!product) throw new Error("Product SKU not found.");
  const existing = (
    await queryRows("SELECT id FROM inventory WHERE product_id = ? AND inventory_level = 'PRODUCT' LIMIT 1", [product.id])
  )[0];

  if (existing) {
    await executeSql("UPDATE inventory SET current_stock = ?, low_stock_threshold = ? WHERE id = ?", [
      stock,
      threshold,
      existing.id,
    ]);
  } else {
    await executeSql(
      "INSERT INTO inventory (product_id, variant_id, inventory_level, current_stock, reserved_stock, low_stock_threshold) VALUES (?, NULL, 'PRODUCT', ?, 0, ?)",
      [product.id, stock, threshold],
    );
  }
}

async function resolveCategoryId(category) {
  const categorySlug = slugify(category || "Sanitary Pads");
  const rows = await queryRows("SELECT id FROM product_categories WHERE slug = ? OR name = ? LIMIT 1", [categorySlug, category]);
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

async function replaceProductImages(productId, name, imageUrls) {
  await executeSql("DELETE FROM product_images WHERE product_id = ?", [productId]);
  await saveProductImages(productId, name, imageUrls);
}

async function saveProductImages(productId, name, imageUrls) {
  for (const [index, imageUrl] of imageUrls.entries()) {
    const normalizedImageUrl = normalizeImagePath(imageUrl);
    if (!normalizedImageUrl || normalizedImageUrl === "No Image") continue;
    await executeSql(
      `
        INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order, is_featured)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [productId, index === 0 ? "FEATURED" : "OTHER", normalizedImageUrl, name, (index + 1) * 10, index === 0 ? 1 : 0],
    );
  }
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

async function customersPayload() {
  const rows = await queryRows(`
    SELECT
      c.id,
      c.name,
      c.email,
      c.mobile,
      c.whatsapp_number,
      c.status,
      c.created_at,
      c.last_login_at,
      COUNT(DISTINCT o.id) AS order_count
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 300
  `);
  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const blocked = rows.filter((row) => row.status === "BLOCKED").length;
  const withOrders = rows.filter((row) => Number(row.order_count || 0) > 0).length;

  return {
    title: "Customers",
    action: "Add New",
    columns: ["Name", "Email", "Mobile", "WhatsApp", "Orders", "Joined", "Last Login", "Status"],
    rows: rows.map((row) => [
      value(row.name),
      value(row.email),
      value(row.mobile, "-"),
      value(row.whatsapp_number, "-"),
      String(row.order_count || 0),
      dateOnly(row.created_at),
      dateOnly(row.last_login_at),
      value(row.status, "ACTIVE"),
    ]),
    metrics: [
      { label: "Customers", value: String(rows.length), trend: `${active} active`, tone: rows.length ? "up" : "neutral" },
      { label: "With Orders", value: String(withOrders), trend: "Order history", tone: withOrders ? "up" : "neutral" },
      { label: "Blocked", value: String(blocked), trend: blocked ? "Review" : "Clean", tone: blocked ? "warn" : "up" },
      { label: "Source", value: "MySQL", trend: "Live accounts", tone: "up" },
    ],
    source: "mysql",
  };
}

async function couponsPayload() {
  const rows = await queryRows(`
    SELECT code, description, discount_type, discount_value, minimum_order_amount,
      maximum_discount_amount, starts_at, expires_at, usage_limit,
      usage_limit_per_customer, first_order_only, status
    FROM coupons
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 200
  `);
  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const expiringSoon = rows.filter((row) => {
    if (!row.expires_at) return false;
    const expiry = new Date(row.expires_at).getTime();
    const now = Date.now();
    return expiry >= now && expiry <= now + 1000 * 60 * 60 * 24 * 7;
  }).length;

  return {
    title: "Coupons",
    action: "Create Coupon",
    columns: ["Code", "Type", "Discount", "Min Order", "Usage Limit", "Starts", "Expires", "Status"],
    rows: rows.map((row) => [
      value(row.code),
      value(row.discount_type),
      row.discount_type === "FIXED"
        ? `Rs.${Number(row.discount_value || 0).toLocaleString("en-IN")}`
        : `${Number(row.discount_value || 0).toLocaleString("en-IN")}%`,
      `Rs.${Number(row.minimum_order_amount || 0).toLocaleString("en-IN")}`,
      row.usage_limit === null || row.usage_limit === undefined ? "Unlimited" : String(row.usage_limit),
      dateOnly(row.starts_at),
      dateOnly(row.expires_at),
      value(row.status, "ACTIVE"),
    ]),
    metrics: [
      { label: "Coupons", value: String(rows.length), trend: "Live MySQL rows", tone: "neutral" },
      { label: "Active", value: String(activeCount), trend: "Currently usable", tone: activeCount ? "up" : "neutral" },
      { label: "Ending Soon", value: String(expiringSoon), trend: "Next 7 days", tone: expiringSoon ? "warn" : "up" },
      { label: "Expired", value: String(rows.filter((row) => row.status === "EXPIRED").length), trend: "Needs review", tone: "neutral" },
    ],
    source: "mysql",
  };
}

async function createCoupon(input) {
  const coupon = couponInput(input);
  await executeSql(
    `INSERT INTO coupons (
      code, description, discount_type, discount_value, minimum_order_amount,
      maximum_discount_amount, starts_at, expires_at, usage_limit,
      usage_limit_per_customer, first_order_only, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      coupon.code,
      coupon.description,
      coupon.discountType,
      coupon.discountValue,
      coupon.minimumOrderAmount,
      coupon.maximumDiscountAmount,
      coupon.startsAt,
      coupon.expiresAt,
      coupon.usageLimit,
      coupon.usageLimitPerCustomer,
      coupon.firstOrderOnly,
      coupon.status,
    ],
  );
}

async function updateCoupon(input) {
  const originalCode = cleanText(input.originalKey || input.code, 50).toUpperCase();
  if (!originalCode) {
    const error = new Error("Coupon code is required.");
    error.statusCode = 400;
    throw error;
  }
  const coupon = couponInput(input);
  await executeSql(
    `UPDATE coupons SET
      code = ?, description = ?, discount_type = ?, discount_value = ?,
      minimum_order_amount = ?, maximum_discount_amount = ?, starts_at = ?,
      expires_at = ?, usage_limit = ?, usage_limit_per_customer = ?,
      first_order_only = ?, status = ?
    WHERE code = ? AND deleted_at IS NULL`,
    [
      coupon.code,
      coupon.description,
      coupon.discountType,
      coupon.discountValue,
      coupon.minimumOrderAmount,
      coupon.maximumDiscountAmount,
      coupon.startsAt,
      coupon.expiresAt,
      coupon.usageLimit,
      coupon.usageLimitPerCustomer,
      coupon.firstOrderOnly,
      coupon.status,
      originalCode,
    ],
  );
}

async function deleteCoupon(input) {
  const code = cleanText(input.originalKey || input.code, 50).toUpperCase();
  if (!code) {
    const error = new Error("Coupon code is required.");
    error.statusCode = 400;
    throw error;
  }
  await executeSql("UPDATE coupons SET deleted_at = NOW(), status = 'INACTIVE' WHERE code = ? AND deleted_at IS NULL", [code]);
}

function couponInput(input) {
  const code = cleanText(input.code || input.title, 50).toUpperCase();
  if (!code) {
    const error = new Error("Coupon code is required.");
    error.statusCode = 400;
    throw error;
  }
  const discountType = input.discountType === "FIXED" ? "FIXED" : "PERCENTAGE";
  const discountValue = moneyValue(input.discountValue);
  if (discountValue <= 0) {
    const error = new Error("Discount value is required.");
    error.statusCode = 400;
    throw error;
  }
  return {
    code,
    description: cleanText(input.title || input.notes, 255) || null,
    discountType,
    discountValue,
    minimumOrderAmount: moneyValue(input.minimumOrderAmount),
    maximumDiscountAmount: optionalNullableMoney(input.maximumDiscountAmount),
    startsAt: dateTimeOrNull(input.startsAt, false),
    expiresAt: dateTimeOrNull(input.expiresAt, true),
    usageLimit: optionalPositiveInt(input.usageLimit),
    usageLimitPerCustomer: optionalPositiveInt(input.usageLimitPerCustomer),
    firstOrderOnly: input.firstOrderOnly ? 1 : 0,
    status: ["ACTIVE", "INACTIVE", "EXPIRED"].includes(String(input.status)) ? String(input.status) : "ACTIVE",
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
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/uploads/") || trimmed.startsWith("data:image/")) return trimmed;
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

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function cleanText(input, maxLength) {
  return String(input ?? "").trim().slice(0, maxLength);
}

function cleanImageText(input) {
  return cleanText(input, 6000000);
}

function productStatusValue(input) {
  const status = String(input);
  return status === "INACTIVE" || status === "DRAFT" ? status : "ACTIVE";
}

function moneyValue(input) {
  const parsed = Number.parseFloat(cleanText(input, 16) || "0");
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function optionalMoneyValue(input, fallback) {
  const text = cleanText(input, 16);
  if (!text) return Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
  return moneyValue(text);
}

function optionalNullableMoney(input) {
  const text = cleanText(input, 16);
  if (!text) return null;
  return moneyValue(text);
}

function optionalPositiveInt(input) {
  const text = cleanText(input, 12);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function dateTimeOrNull(input, endOfDay) {
  const text = cleanText(input, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return `${text} ${endOfDay ? "23:59:59" : "00:00:00"}`;
}

function dateOnly(input) {
  if (!input) return "-";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function csvJson(input) {
  return cleanText(input, 2000)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function jsonListOrExisting(input, fallback) {
  const items = csvJson(input);
  return items.length ? JSON.stringify(items) : fallback || JSON.stringify([]);
}

function imageList(input, fallback) {
  const images = cleanImageText(input)
    .split(/\r?\n/)
    .map((item) => cleanImageText(item))
    .filter(Boolean);
  const normalizedFallback = cleanImageText(fallback);
  const list = normalizedFallback ? [normalizedFallback, ...images] : images;
  return list.filter((item, index) => list.indexOf(item) === index);
}

function checkboxValue(input) {
  return input === true || input === "true" || input === "on" || input === "1" ? 1 : 0;
}

function flowSet(input) {
  const allowed = new Set(["LIGHT", "MEDIUM", "HEAVY", "OVERNIGHT"]);
  const values = cleanText(input, 120)
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => allowed.has(item));
  return values.length ? values.join(",") : "MEDIUM";
}

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 170);
}

function packagingSafetyText(input) {
  return [cleanText(input.safetyInformation, 1000), cleanText(input.anionStripNotes, 2000)].filter(Boolean).join("\n\n");
}
