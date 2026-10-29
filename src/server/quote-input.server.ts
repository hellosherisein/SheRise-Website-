import { createHash } from "node:crypto";
import { z } from "zod";
export const quoteInputSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().max(220),
        size: z.string().max(50),
        flow: z.string().max(150),
        pack: z.string().max(80),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  pin: z.string().regex(/^[1-9][0-9]{5}$/),
  coupon: z.string().trim().max(50).default(""),
  donationAmount: z
    .union([
      z.literal(0),
      z.literal(10),
      z.literal(20),
      z.literal(50),
      z.literal(80),
      z.literal(100),
    ])
    .default(0),
  payment: z.enum(["UPI", "Cards", "Net Banking", "Wallet", "Cash on Delivery"]),
});
export function quoteFingerprint(input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(quoteInputSchema.parse(input)))
    .digest("hex");
}
