import type { CartItem } from "./cart";
import type { Product } from "./catalog";

const optionKey = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export function resolveCartSelection(item: CartItem, product: Product | undefined) {
  if (!product) return { item, optionsMatch: false, issues: ["Product is no longer available"] };
  const size = product.sizes.find((value) => optionKey(value) === optionKey(item.size));
  const flow = product.flow.find((value) => optionKey(value) === optionKey(item.flow));
  const pack = product.packOptions.find((value) => optionKey(value.label) === optionKey(item.pack));
  const issues = [!size && "Choose a current size", !flow && "Choose a current flow", !pack && "Choose a current pack"].filter(Boolean) as string[];
  if (item.quantity > product.stock) issues.push(`Only ${product.stock} available`);
  return {
    optionsMatch: Boolean(size && flow && pack),
    item: { ...item, size: size || item.size, flow: flow || item.flow, pack: pack?.label || item.pack,
      price: pack?.price ?? item.price, name: product.name, image: product.images[0] || item.image || "" },
    issues,
  };
}
