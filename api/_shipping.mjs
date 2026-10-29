import { commerceError, selectPackage } from "./_commerce.mjs";

import { ekartClient } from "./_ekart-client.mjs";

function amount(value) {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "")
    throw commerceError(502, "Ekart returned an incomplete charge breakdown.");
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0)
    throw commerceError(502, "Ekart returned an invalid charge.");
  return result;
}
export function createCarrier(client = ekartClient) {
  return {
    async quote(input) {
      if (!input.pricingConfirmed || !input.courierGroup || !input.pricingPlan)
        throw commerceError(
          409,
          "Admin must confirm the Ekart account pricing plan and courier group before quoting.",
        );
      const [pickup, drop] = await Promise.all([
        client.serviceability(input.pickupPin),
        client.serviceability(input.deliveryPin),
      ]);
      const prepaidAvailable =
        pickup?.status === true &&
        pickup.details?.forward_pickup === true &&
        drop?.status === true &&
        drop.details?.forward_drop === true;
      if (!prepaidAvailable)
        throw commerceError(
          400,
          "Delivery is unavailable for this pickup and destination PIN combination.",
        );
      const maxCodAmount = Number(drop.details?.max_cod_amount);
      const codAvailable =
        drop.details?.cod === true && Number.isFinite(maxCodAmount) && maxCodAmount > 0;
      if (input.payment === "COD" && (!codAvailable || input.collectibleAmount > maxCodAmount))
        throw commerceError(400, "COD is unavailable or exceeds the destination collection limit.");
      const rates = await client.rates({
        pickupPincode: input.pickupPin,
        dropPincode: input.deliveryPin,
        length: String(Math.ceil(input.parcel.lengthCm)),
        width: String(Math.ceil(input.parcel.widthCm)),
        height: String(Math.ceil(input.parcel.heightCm)),
        weight: String(Math.ceil(input.parcel.weightG)),
        paymentType: input.payment === "COD" ? "COD" : "Prepaid",
        serviceType: input.serviceType,
        invoiceAmount: String(input.shipmentValue + input.productTax),
        codAmount: String(input.payment === "COD" ? input.collectibleAmount : 0),
      });
      if (!Array.isArray(rates))
        throw commerceError(502, "Ekart returned an invalid serviceability/rate response.");
      const matches = rates.filter((rate) => rate.courierGroup === input.courierGroup);
      if (matches.length !== 1)
        throw commerceError(
          409,
          "The configured Ekart courier group did not return one unambiguous rate. Review account configuration.",
        );
      const charges = matches[0].forwardDeliveredCharges;
      const carrierCost = amount(charges?.forwardFreight) + amount(charges?.forwardFuelSurcharge);
      const codFee = amount(charges?.codCharges),
        shippingTax = amount(charges?.deliveredTotalTax),
        carrierTotal = amount(charges?.totalForwardDeliveredEstimate);
      if (
        Math.abs(carrierCost + codFee + shippingTax - carrierTotal) > 0.011 ||
        (input.payment !== "COD" && codFee !== 0)
      )
        throw commerceError(
          502,
          "Ekart charge components do not match its total. No quote was issued.",
        );
      return {
        prepaidAvailable,
        codAvailable,
        maxCodAmount,
        carrierCost,
        codFee,
        shippingTax,
        carrierTotal,
        pricingPlan: input.pricingPlan,
        courierGroup: input.courierGroup,
      };
    },
    create: (payload) => client.create(payload),
  };
}
export const ekartCarrier = createCarrier();

export async function calculateShipping(
  { items, pin, payment, discountedProducts, donation, gst, config },
  carrier = ekartCarrier,
) {
  if (!/^[1-9][0-9]{5}$/.test(pin)) throw commerceError(400, "Enter a valid six-digit PIN code.");
  const parcel = selectPackage(items, config.packages);
  if (!config.pricingPlan)
    throw commerceError(409, "Ekart account pricing plan requires admin configuration.");
  const cod = payment === "Cash on Delivery";
  let response;
  let collectible = roundMoney(discountedProducts + gst + donation);
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await carrier.quote({
      pickupPin: config.pickupPin,
      deliveryPin: pin,
      parcel,
      payment: cod ? "COD" : "PREPAID",
      shipmentValue: discountedProducts,
      donation,
      productTax: gst,
      pricingPlan: config.pricingPlan,
      pricingConfirmed: config.pricingConfirmed,
      courierGroup: config.courierGroup,
      serviceType: config.serviceType,
      collectibleAmount: collectible,
    });
    const free =
      config.shippingPolicy === "FREE_THRESHOLD" &&
      config.freeShippingThreshold !== null &&
      discountedProducts >= config.freeShippingThreshold;
    const payable = roundMoney(
      discountedProducts +
        gst +
        donation +
        (free ? 0 : response.carrierCost + response.shippingTax) +
        (cod ? response.codFee : 0),
    );
    if (!cod || Math.abs(payable - collectible) < 0.005) break;
    if (attempt === 3)
      throw commerceError(
        502,
        "COD shipping charges could not stabilize. Please choose online payment or contact support.",
      );
    collectible = payable;
  }
  if (!response.prepaidAvailable || (cod && !response.codAvailable))
    throw commerceError(
      400,
      cod
        ? "Cash on Delivery is unavailable for this PIN code."
        : "Delivery is unavailable for this PIN code.",
    );
  if (response.pricingPlan !== config.pricingPlan)
    throw commerceError(502, "Carrier account pricing could not be confirmed.");
  // Adapter must normalize the documented response into non-overlapping, tax-inclusive charges.
  const amounts = [response.carrierCost, response.codFee, response.shippingTax];
  if (!amounts.every((v) => Number.isFinite(v) && v >= 0))
    throw commerceError(502, "Carrier returned an invalid rate.");
  const round = roundMoney;
  const free =
    config.shippingPolicy === "FREE_THRESHOLD" &&
    config.freeShippingThreshold !== null &&
    discountedProducts >= config.freeShippingThreshold;
  const shippingAmount = free ? 0 : round(response.carrierCost + response.shippingTax);
  const codFee = cod ? round(response.codFee) : 0;
  const total = round(discountedProducts + gst + shippingAmount + codFee + donation);
  const codMaximum = Math.min(
    config.codMaximum,
    Number.isFinite(response.maxCodAmount) ? response.maxCodAmount : config.codMaximum,
  );
  if (cod && (discountedProducts <= config.codMinimum || total > codMaximum))
    throw commerceError(
      400,
      `COD requires products above ₹${config.codMinimum} and a collectible amount up to ₹${config.codMaximum}.`,
    );
  return {
    parcel,
    carrierCost: response.carrierCost,
    shippingTax: response.shippingTax,
    shippingAmount,
    codFee,
    total,
    prepaidAvailable: response.prepaidAvailable,
    codAvailable: response.codAvailable,
    codMinimum: config.codMinimum,
    codMaximum,
    codAmount: cod ? total : 0,
    pricingPlan: config.pricingPlan,
    courierGroup: config.courierGroup || "",
    serviceType: config.serviceType || "SURFACE",
  };
}

// Contract-independent token lifecycle. No auth endpoint or token fields are assumed.
export function tokenCache(authenticate, now = () => Date.now()) {
  let cached, pending;
  return {
    clear() {
      cached = undefined;
    },
    async get() {
      if (cached && cached.expiresAt > now() + 30000) return cached.token;
      pending ??= Promise.resolve()
        .then(authenticate)
        .then((result) => {
          if (
            !result?.token ||
            !Number.isFinite(result.expiresAt) ||
            result.expiresAt <= now() + 30000
          )
            throw commerceError(503, "Carrier authentication returned an unusable token.");
          cached = result;
          return result.token;
        })
        .finally(() => {
          pending = undefined;
        });
      return pending;
    },
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
