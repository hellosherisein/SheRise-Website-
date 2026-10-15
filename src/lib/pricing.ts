export const GST_PERCENT = 0;
export const GST_RATE = GST_PERCENT / 100;
export const STANDARD_SHIPPING_CHARGE = 40;
export const FREE_SHIPPING_THRESHOLD = 499;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export type CouponDiscount =
  | boolean
  | {
      discountType: "PERCENTAGE" | "FIXED";
      discountValue: number;
      minimumOrderAmount?: number;
      maximumDiscountAmount?: number | null;
    }
  | null
  | undefined;

export function calculateOrderTotals(subtotal: number, couponDiscount: CouponDiscount, donationAmount = 0) {
  const discountAmount = calculateDiscountAmount(subtotal, couponDiscount);
  const taxableAmount = Math.max(0, roundMoney(subtotal - discountAmount));
  const gstAmount = roundMoney(taxableAmount * GST_RATE);
  const shippingAmount = taxableAmount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_CHARGE;
  const total = roundMoney(taxableAmount + gstAmount + shippingAmount + donationAmount);

  return {
    subtotal: roundMoney(subtotal),
    discountAmount,
    taxableAmount,
    gstPercent: GST_PERCENT,
    gstAmount,
    shippingAmount,
    donationAmount,
    total,
  };
}

function calculateDiscountAmount(subtotal: number, couponDiscount: CouponDiscount) {
  if (couponDiscount === true) return roundMoney(subtotal * 0.1);
  if (!couponDiscount) return 0;
  if (subtotal < Number(couponDiscount.minimumOrderAmount || 0)) return 0;

  const rawDiscount =
    couponDiscount.discountType === "FIXED"
      ? couponDiscount.discountValue
      : subtotal * (couponDiscount.discountValue / 100);
  const cappedDiscount =
    couponDiscount.maximumDiscountAmount && couponDiscount.maximumDiscountAmount > 0
      ? Math.min(rawDiscount, couponDiscount.maximumDiscountAmount)
      : rawDiscount;
  return roundMoney(Math.min(Math.max(0, cappedDiscount), subtotal));
}
