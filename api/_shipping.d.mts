import type { CommerceConfig, CommerceItem } from "./_commerce.mjs";
export function calculateShipping(input: {
  items: CommerceItem[];
  pin: string;
  payment: string;
  discountedProducts: number;
  donation: number;
  gst: number;
  config: CommerceConfig;
}): Promise<{
  parcel: { weightG: number; lengthCm: number; widthCm: number; heightCm: number };
  carrierCost: number;
  shippingTax: number;
  shippingAmount: number;
  codFee: number;
  total: number;
  prepaidAvailable: boolean;
  codAvailable: boolean;
  codMinimum: number;
  codMaximum: number;
  codAmount: number;
  pricingPlan: string;
  courierGroup: string;
  serviceType: string;
}>;
