export const GST_PERCENT = 0;
export const GST_RATE = GST_PERCENT / 100;
export const STANDARD_SHIPPING_CHARGE = 40;
export const FREE_SHIPPING_THRESHOLD = 499;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateOrderTotals(subtotal: number, hasCouponDiscount: boolean) {
  const discountAmount = roundMoney(hasCouponDiscount ? subtotal * 0.1 : 0);
  const taxableAmount = Math.max(0, roundMoney(subtotal - discountAmount));
  const gstAmount = roundMoney(taxableAmount * GST_RATE);
  const shippingAmount = taxableAmount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_CHARGE;
  const total = roundMoney(taxableAmount + gstAmount + shippingAmount);

  return {
    subtotal: roundMoney(subtotal),
    discountAmount,
    taxableAmount,
    gstPercent: GST_PERCENT,
    gstAmount,
    shippingAmount,
    total,
  };
}
