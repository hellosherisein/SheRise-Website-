export type CodPolicy = { minimum: number; maximumCollectible: number };
export const defaultCodPolicy: CodPolicy = { minimum: 1000, maximumCollectible: 20000 };

export function codEligibility(
  discountedProducts: number,
  collectible: number,
  destinationCod: boolean,
  policy = defaultCodPolicy,
) {
  if (
    ![discountedProducts, collectible, policy.minimum, policy.maximumCollectible].every(
      Number.isFinite,
    ) ||
    discountedProducts < 0 ||
    collectible <= 0
  )
    return { eligible: false, reason: "A valid order total is required for Cash on Delivery." };
  if (discountedProducts <= policy.minimum)
    return {
      eligible: false,
      reason: `COD requires discounted products above ₹${policy.minimum}, excluding shipping and donation.`,
    };
  if (collectible > policy.maximumCollectible)
    return {
      eligible: false,
      reason: `The amount payable on delivery cannot exceed ₹${policy.maximumCollectible}.`,
    };
  if (!destinationCod)
    return {
      eligible: false,
      reason: "Cash on Delivery is unavailable for this delivery PIN code.",
    };
  return { eligible: true, reason: "Pay the final order amount on delivery." };
}
