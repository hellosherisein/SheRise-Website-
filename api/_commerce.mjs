import { z } from "zod";

export const commerceConfigSchema = z
  .object({
    codMinimum: z.number().min(0).max(20000).default(1000),
    codMaximum: z.number().positive().max(20000).default(20000),
    pickupPin: z.literal("400013").default("400013"),
    pickupName: z.string().max(120).default(""),
    pickupPhone: z.string().max(20).default(""),
    pickupAddress: z.string().max(500).default(""),
    freeShippingThreshold: z.number().nonnegative().nullable().default(499),
    shippingPolicy: z.enum(["CARRIER", "FREE_THRESHOLD"]).default("FREE_THRESHOLD"),
    pricingPlan: z.string().max(80).default(""),
    pricingConfirmed: z.boolean().default(false),
    courierGroup: z.string().trim().max(100).default(""),
    serviceType: z.enum(["SURFACE", "EXPRESS"]).default("SURFACE"),
    pickupCity: z.string().trim().max(100).default(""),
    pickupState: z.string().trim().max(100).default(""),
    sellerName: z.string().trim().max(120).default(""),
    sellerAddress: z.string().trim().max(500).default(""),
    sellerGstTin: z.string().trim().max(30).default(""),
    sellerTaxStatus: z.enum(["UNCONFIGURED", "REGISTERED", "UNREGISTERED"]).default("UNCONFIGURED"),
    categoryOfGoods: z.string().trim().max(150).default(""),
    packages: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          maxUnits: z.number().int().positive(),
          maxWeightG: z.number().positive(),
          tareWeightG: z.number().nonnegative(),
          lengthCm: z.number().positive(),
          widthCm: z.number().positive(),
          heightCm: z.number().positive(),
        }),
      )
      .max(30)
      .default([]),
  })
  .refine((v) => v.codMaximum > v.codMinimum, "COD maximum must exceed minimum.");
export const commerceError = (status, message) =>
  Object.assign(new Error(message), { status, statusCode: status });
export const jsonValue = (v) => (typeof v === "string" ? JSON.parse(v) : v);
export async function readCommerceConfig(query) {
  const rows = await query("SELECT config FROM commerce_configuration WHERE id = 1");
  return commerceConfigSchema.parse(rows[0] ? jsonValue(rows[0].config) : {});
}
export async function commerceSettingsPayload(query) {
  const config = await readCommerceConfig(query);
  return {
    title: "Shipping Settings",
    action: "Save Settings",
    source: "mysql",
    config,
    activation: {
      enabled: process.env.EKART_SHIPPING_ENABLED === "true",
      adapterReady: true,
      message:
        "Documented Ekart APIs are implemented. Account credentials, confirmed pricing and explicit live shipment approval are still required.",
    },
    columns: ["Setting", "Value"],
    rows: [
      ["COD minimum (exclusive)", String(config.codMinimum)],
      ["COD collectible maximum", String(config.codMaximum)],
      ["Pickup PIN", config.pickupPin],
      [
        "Live shipping",
        process.env.EKART_SHIPPING_ENABLED === "true"
          ? "Enabled by server operator"
          : "Disabled; explicit approval required",
      ],
    ],
    metrics: [],
  };
}
export async function saveCommerceConfig(execute, input) {
  const config = commerceConfigSchema.parse(input);
  await execute(
    "INSERT INTO commerce_configuration (id, config) VALUES (1, ?) ON DUPLICATE KEY UPDATE config = VALUES(config)",
    [JSON.stringify(config)],
  );
}

export function selectPackage(items, packages) {
  let units = 0,
    weightG = 0;
  for (const { product, quantity } of items) {
    if (
      ![
        product.shippingWeightG,
        product.packageLengthCm,
        product.packageWidthCm,
        product.packageHeightCm,
      ].every((v) => Number.isFinite(v) && v > 0)
    )
      throw commerceError(
        409,
        `${product.name}: shipping measurements require admin configuration.`,
      );
    units += quantity;
    weightG += product.shippingWeightG * quantity;
  }
  if (items.length === 1 && units === 1) {
    const p = items[0].product;
    return {
      weightG,
      lengthCm: p.packageLengthCm,
      widthCm: p.packageWidthCm,
      heightCm: p.packageHeightCm,
    };
  }
  const box = packages.find((p) => units <= p.maxUnits && weightG + p.tareWeightG <= p.maxWeightG);
  if (!box) throw commerceError(409, "No validated package is configured for this order.");
  return {
    weightG: weightG + box.tareWeightG,
    lengthCm: box.lengthCm,
    widthCm: box.widthCm,
    heightCm: box.heightCm,
  };
}

export async function validateCoupon(connection, code, customerId, items) {
  if (!code) return null;
  const [coupons] = await connection.query(
    `SELECT * FROM coupons WHERE code = ? AND deleted_at IS NULL AND status = 'ACTIVE'
 AND (starts_at IS NULL OR starts_at <= NOW()) AND (expires_at IS NULL OR expires_at >= NOW()) FOR UPDATE`,
    [code.toUpperCase()],
  );
  const coupon = coupons[0];
  if (!coupon) throw commerceError(400, "This coupon is no longer active.");
  const [usage] = await connection.query(
    `SELECT u.customer_id FROM coupon_usage u JOIN orders o ON o.id = u.order_id WHERE u.coupon_id = ? AND o.order_status <> 'CANCELLED' FOR UPDATE`,
    [coupon.id],
  );
  if (
    (coupon.usage_limit != null && usage.length >= coupon.usage_limit) ||
    (coupon.usage_limit_per_customer != null &&
      usage.filter((row) => String(row.customer_id) === String(customerId)).length >=
        coupon.usage_limit_per_customer)
  )
    throw commerceError(400, "This coupon's usage limit has been reached.");
  if (coupon.first_order_only) {
    const [previous] = await connection.query(
      "SELECT id FROM orders WHERE customer_id = ? AND order_status <> 'CANCELLED' LIMIT 1 FOR UPDATE",
      [customerId],
    );
    if (previous.length) throw commerceError(400, "This coupon is for the first order only.");
  }
  const [products] = await connection.query(
    "SELECT product_id FROM coupon_products WHERE coupon_id = ?",
    [coupon.id],
  );
  const [categories] = await connection.query(
    "SELECT category_id FROM coupon_categories WHERE coupon_id = ?",
    [coupon.id],
  );
  let eligible = items;
  if (products.length || categories.length) {
    const [assignments] = await connection.query(
      "SELECT product_id, category_id FROM product_category_assignments WHERE product_id IN (?)",
      [items.map((i) => i.product.id)],
    );
    eligible = items.filter(
      (i) =>
        products.some((p) => String(p.product_id) === String(i.product.id)) ||
        assignments.some(
          (a) =>
            String(a.product_id) === String(i.product.id) &&
            categories.some((c) => String(c.category_id) === String(a.category_id)),
        ),
    );
  }
  const subtotal = eligible.reduce((s, i) => s + i.price * i.quantity, 0);
  if (!eligible.length || subtotal < Number(coupon.minimum_order_amount))
    throw commerceError(400, "Coupon products or minimum amount are not eligible.");
  const raw =
    coupon.discount_type === "FIXED"
      ? Number(coupon.discount_value)
      : (subtotal * Number(coupon.discount_value)) / 100;
  return {
    id: coupon.id,
    eligibleProductIds: eligible.map((i) => String(i.product.id)),
    eligibleSubtotal: subtotal,
    discount:
      Math.round(
        Math.min(
          subtotal,
          raw,
          coupon.maximum_discount_amount == null
            ? Infinity
            : Number(coupon.maximum_discount_amount),
        ) * 100,
      ) / 100,
  };
}

export function productTax(items, coupon) {
  let tax = 0;
  for (const item of items) {
    const rate = Number(item.product.gstPercent || 0);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
      throw commerceError(409, "Product tax requires admin correction.");
    const base = item.price * item.quantity;
    const discount = coupon?.eligibleProductIds.includes(String(item.product.id))
      ? (coupon.discount * base) / coupon.eligibleSubtotal
      : 0;
    tax += ((base - discount) * rate) / 100;
  }
  return Math.round(tax * 100) / 100;
}

export async function expireUnpaidOrder(connection, orderId) {
  const [orders] = await connection.query("SELECT * FROM orders WHERE id = ? FOR UPDATE", [
    orderId,
  ]);
  const order = orders[0];
  if (
    !order ||
    order.payment_method !== "RAZORPAY" ||
    order.payment_status === "SUCCESS" ||
    order.order_status !== "NEW"
  )
    return false;
  const [expired] = await connection.query(
    "SELECT order_id FROM stock_allocations WHERE order_id = ? AND state = 'RESERVED' AND expires_at <= NOW() LIMIT 1",
    [orderId],
  );
  if (!expired.length) return false;
  await transitionStock(connection, orderId, "release");
  await connection.execute(
    "UPDATE orders SET order_status = 'CANCELLED', cancelled_at = NOW() WHERE id = ?",
    [orderId],
  );
  await connection.execute(
    "INSERT INTO order_status_history (order_id, previous_status, new_status, note) VALUES (?, 'NEW', 'CANCELLED', ?)",
    [
      orderId,
      "Unpaid stock reservation expired. Any late captured payment requires manual refund review; do not fulfill.",
    ],
  );
  return true;
}

export async function reserveStock(connection, orderId, items, prepaid) {
  const quantities = new Map();
  for (const i of items)
    quantities.set(String(i.product.id), (quantities.get(String(i.product.id)) || 0) + i.quantity);
  for (const [productId, requested] of [...quantities].sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )) {
    const [allRows] = await connection.query(
      "SELECT id, current_stock, reserved_stock, inventory_level FROM inventory WHERE product_id = ? ORDER BY id FOR UPDATE",
      [productId],
    );
    const productRows = allRows.filter((row) => row.inventory_level === "PRODUCT");
    const rows = productRows.length ? productRows : allRows;
    if (rows.length > 1)
      throw commerceError(
        409,
        "This product has ambiguous inventory rows. Admin must configure its stock allocation before purchase.",
      );
    if (
      rows.reduce(
        (n, r) => n + Math.max(0, Number(r.current_stock) - Number(r.reserved_stock)),
        0,
      ) < requested
    )
      throw commerceError(409, "Insufficient stock. Please review your bag.");
    let remaining = requested;
    for (const row of rows) {
      const quantity = Math.min(
        remaining,
        Math.max(0, Number(row.current_stock) - Number(row.reserved_stock)),
      );
      if (!quantity) continue;
      await connection.execute(
        "UPDATE inventory SET reserved_stock = reserved_stock + ? WHERE id = ?",
        [quantity, row.id],
      );
      await connection.execute(
        `INSERT INTO stock_allocations (order_id, inventory_id, quantity, state, expires_at) VALUES (?, ?, ?, 'RESERVED', ${prepaid ? "DATE_ADD(NOW(), INTERVAL 30 MINUTE)" : "NULL"})`,
        [orderId, row.id, quantity],
      );
      remaining -= quantity;
    }
  }
}

export async function transitionStock(connection, orderId, action) {
  const [allocations] = await connection.query(
    "SELECT * FROM stock_allocations WHERE order_id = ? ORDER BY inventory_id FOR UPDATE",
    [orderId],
  );
  for (const a of allocations) {
    if (a.state === "RELEASED" || (a.state === "COMMITTED" && action !== "restock")) continue;
    await connection.query("SELECT id FROM inventory WHERE id = ? FOR UPDATE", [a.inventory_id]);
    if (a.state === "COMMITTED")
      await connection.execute(
        "UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?",
        [a.quantity, a.inventory_id],
      );
    else if (action === "commit")
      await connection.execute(
        "UPDATE inventory SET current_stock = current_stock - ?, reserved_stock = reserved_stock - ? WHERE id = ?",
        [a.quantity, a.quantity, a.inventory_id],
      );
    else
      await connection.execute(
        "UPDATE inventory SET reserved_stock = reserved_stock - ? WHERE id = ?",
        [a.quantity, a.inventory_id],
      );
    await connection.execute(
      "UPDATE stock_allocations SET state = ?, expires_at = NULL WHERE order_id = ? AND inventory_id = ?",
      [action === "commit" ? "COMMITTED" : "RELEASED", orderId, a.inventory_id],
    );
  }
}

export async function queueShipment(connection, order) {
  if (order.payment_method !== "COD" && order.payment_status !== "SUCCESS") return;
  if (["CANCELLED", "RETURNED", "REFUNDED"].includes(order.order_status)) return;
  await connection.execute(
    `INSERT IGNORE INTO ekart_shipments (order_id, reference, status, cod_amount, cod_settlement_status, last_error) VALUES (?, ?, '${process.env.EKART_SHIPPING_ENABLED === "true" ? "QUEUED" : "BLOCKED"}', ?, ?, ?)`,
    [
      order.id,
      order.order_number,
      order.payment_method === "COD" ? order.grand_total : 0,
      order.payment_method === "COD" ? "PENDING" : "NOT_APPLICABLE",
      process.env.EKART_SHIPPING_ENABLED === "true"
        ? null
        : "Live Ekart shipment creation is disabled pending explicit approval.",
    ],
  );
}
