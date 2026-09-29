import { getProduct } from "./catalog";
export type CartItem = {
  slug: string;
  quantity: number;
  size: string;
  flow: string;
  pack: string;
  price: number;
  name?: string;
  image?: string;
};
export const cartKey = (i: CartItem) => [i.slug, i.size, i.flow, i.pack].join("|");
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function cartStock(i: CartItem) {
  const productStock = getProduct(i.slug)?.packOptions.find((p) => p.label === i.pack)?.stock;
  return productStock && productStock > 0 ? productStock : 99;
}

function customCartItem(i: Record<string, unknown>): CartItem[] {
  const slug = typeof i.slug === "string" ? i.slug : "";
  const pack = typeof i.pack === "string" ? i.pack : "";
  const size = typeof i.size === "string" ? i.size : "";
  const flow = typeof i.flow === "string" ? i.flow : "";
  const price = Number(i.price);
  const quantity = Number(i.quantity);
  if (!slug || !pack || !size || !flow || !Number.isFinite(price) || !Number.isFinite(quantity))
    return [];
  return [
    {
      slug,
      pack,
      size,
      flow,
      price,
      name: typeof i.name === "string" ? i.name : undefined,
      image: typeof i.image === "string" ? i.image : undefined,
      quantity: Math.min(99, Math.max(1, Math.floor(quantity))),
    },
  ];
}

export function validCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((i) => {
    if (!i || typeof i !== "object") return [];
    const p = getProduct(i.slug),
      v = p?.packOptions.find((v) => v.label === i.pack);
    if (!Number.isFinite(i.quantity)) return [];
    if (!p) return customCartItem(i as Record<string, unknown>);
    if (!v || !p.sizes.includes(i.size) || !p.flow.includes(i.flow))
      return customCartItem(i as Record<string, unknown>);
    return [
      {
        slug: p.slug,
        pack: v.label,
        size: i.size,
        flow: i.flow,
        price: v.price,
        name: typeof i.name === "string" ? i.name : p.name,
        image: typeof i.image === "string" ? i.image : p.images[0],
        quantity: Math.min(Math.max(v.stock, 99), Math.max(1, Math.floor(i.quantity))),
      },
    ];
  });
}
