import { quoteInputSchema, quoteFingerprint } from "./quote-input.server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { mysqlSessionUser, guardOrigin, readBody, mysqlLimit } from "./customer.server";
import { loadCatalogProducts } from "./catalog.server";
import { queryRows, executeSql, mysqlTransaction } from "./mysql.server";
import { resolveCartSelection } from "../lib/cart-selection";
import { calculateOrderTotals } from "../lib/pricing";
import {
  commerceError,
  readCommerceConfig,
  validateCoupon,
  productTax,
} from "../../api/_commerce.mjs";
import { calculateShipping } from "../../api/_shipping.mjs";

export async function handleShippingRequest(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") throw commerceError(405, "Method not allowed.");
    guardOrigin(request);
    const user = await mysqlSessionUser(request);
    if (!user) throw commerceError(401, "Please sign in to check delivery.");
    await mysqlLimit(`shipping:${user.id}`, 60);
    const input = quoteInputSchema.parse(await readBody(request));
    const catalog = await loadCatalogProducts();
    const items = input.items.map((i) => {
      const product = catalog.find((p) => p.slug === i.slug);
      const selection = resolveCartSelection({ ...i, price: 0 }, product);
      if (!product || selection.issues.length)
        throw commerceError(409, "Please review your bag options and quantities.");
      return { ...selection.item, product };
    });
    const config = await readCommerceConfig(queryRows);
    const coupon = await mysqlTransaction((c) => validateCoupon(c, input.coupon, user.id, items));
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totals = calculateOrderTotals(
      subtotal,
      coupon ? { discountType: "FIXED", discountValue: coupon.discount } : null,
      input.donationAmount,
    );
    totals.gstAmount = productTax(items, coupon);
    const shipping = await calculateShipping({
      items,
      pin: input.pin,
      payment: input.payment,
      discountedProducts: totals.taxableAmount,
      donation: input.donationAmount,
      gst: totals.gstAmount,
      config,
    });
    const quote = { ...totals, ...shipping, config };
    const id = randomUUID();
    await executeSql(
      "INSERT INTO shipping_quotes (id, customer_id, fingerprint, quote, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))",
      [id, user.id, quoteFingerprint(input), JSON.stringify(quote)],
    );
    return json({
      quote: {
        ...quote,
        config: undefined,
        id,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
    });
  } catch (error) {
    const e = error as { status?: number };
    return json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid delivery request."
            : e.status && error instanceof Error
              ? error.message
              : "Delivery verification is temporarily unavailable. Please try again later.",
      },
      error instanceof z.ZodError ? 400 : e.status || 503,
    );
  }
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
