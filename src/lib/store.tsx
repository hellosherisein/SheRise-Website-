import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./auth";
import { cartKey, validCart, readLocal, saveLocal, type CartItem } from "./cart";
import type { Product } from "./catalog";
import { resolveCartSelection } from "./cart-selection";
export { cartKey, cartStock, validCart, readLocal, saveLocal, type CartItem } from "./cart";
interface Store {
  catalogProducts: Product[] | null;
  catalogError: string;
  retryCatalog: () => void;
  revise: (key: string, changes: Partial<Pick<CartItem, "size" | "flow" | "pack">>) => void;
  ready: boolean;
  cart: CartItem[];
  wishlist: string[];
  cartOpen: boolean;
  searchOpen: boolean;
  setCartOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  add: (i: CartItem) => void;
  remove: (key: string) => void;
  update: (key: string, q: number) => void;
  toggleWish: (slug: string) => void;
  clear: () => void;
}
const Context = createContext<Store | undefined>(undefined);
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  return <CustomerStore key={user?.id || "guest"}>{children}</CustomerStore>;
}
function CustomerStore({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]),
    [guestWishlist, setGuestWishlist] = useState<string[]>([]),
    [accountWishlist, setAccountWishlist] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const namespace = auth.user?.id || "guest";
  const signedIn = !!auth.user;
  const [catalogProducts, setCatalogProducts] = useState<Product[] | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setCatalogError("");
    void (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        let status: number | undefined;
        try {
          const response = await fetch(`/api/catalog/products?t=${Date.now()}`, {
            cache: "no-store",
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
          });
          status = response.status;
          if (!response.ok) throw new Error("Catalog request failed");
          const payload = (await response.json()) as { products?: Product[] };
          if (!Array.isArray(payload.products)) throw new Error("Invalid catalog response");
          if (!cancelled) {
            setCatalogProducts(payload.products);
            setCatalogError("");
          }
          return;
        } catch {
          if (cancelled) return;
          const retryable = !status || status >= 500 || status === 429 || status === 200;
          if (retryable && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
            if (cancelled) return;
            continue;
          }
          setCatalogError(
            `Could not check current products. Please refresh and try again.${status ? ` (HTTP ${status})` : " (Connection timed out or unavailable)"}`,
          );
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [catalogAttempt]);
  useEffect(() => {
    if (auth.loading) return;
    const saved = validCart(readLocal("sherise-cart-v2:" + namespace, []), []);
    const restoredQuantities = new Map<string, number>();
    const restored = catalogProducts
      ? saved.flatMap((item) => {
          const product = catalogProducts.find((p) => p.slug === item.slug);
          if (product && product.stock <= 0) return [];
          const resolved = resolveCartSelection(item, product).item;
          const available = Math.max(
            0,
            (product?.stock ?? resolved.quantity) - (restoredQuantities.get(item.slug) || 0),
          );
          const quantity = Math.min(resolved.quantity, available);
          restoredQuantities.set(item.slug, (restoredQuantities.get(item.slug) || 0) + quantity);
          return quantity > 0 ? [{ ...resolved, quantity }] : [];
        })
      : saved;
    setCart(restored);
    if (!signedIn) {
      const raw = readLocal<unknown>("sherise-guest-wishlist", []);
      setGuestWishlist(Array.isArray(raw) ? raw.filter((s) => typeof s === "string") : []);
    }
    setReady(true);
  }, [namespace, auth.loading, signedIn, catalogProducts]);
  useEffect(() => {
    if (signedIn) setAccountWishlist(auth.wishlist);
  }, [auth.wishlist, signedIn]);
  useEffect(() => {
    if (ready) {
      saveLocal("sherise-cart-v2:" + namespace, cart);
      if (!signedIn) saveLocal("sherise-guest-wishlist", guestWishlist);
    }
  }, [cart, guestWishlist, ready, namespace, signedIn]);
  const wishlist = auth.user ? accountWishlist : guestWishlist;
  return (
    <Context.Provider
      value={{
        catalogProducts,
        catalogError,
        retryCatalog: () => setCatalogAttempt((attempt) => attempt + 1),
        revise: (key, changes) =>
          setCart((current) =>
            current.map((item) => {
              if (cartKey(item) !== key) return item;
              return resolveCartSelection(
                { ...item, ...changes },
                catalogProducts?.find((p) => p.slug === item.slug),
              ).item;
            }),
          ),
        ready: ready && !auth.loading && catalogProducts !== null,
        cart,
        wishlist,
        cartOpen,
        searchOpen,
        setCartOpen,
        setSearchOpen,
        add: (item) => {
          if (!ready || auth.loading) return;
          const product = catalogProducts?.find((product) => product.slug === item.slug);
          const selection = resolveCartSelection(item, product);
          const valid = selection.item;
          if (selection.issues.length) {
            toast.error(
              `${product?.name || item.name || "Product"}: ${selection.issues.join(". ")}. Please choose options on the product page.`,
            );
            return;
          }
          setCart((c) => {
            const otherQuantity = c
              .filter((x) => x.slug === valid.slug && cartKey(x) !== cartKey(valid))
              .reduce((n, x) => n + x.quantity, 0);
            const available = Math.max(0, (product?.stock ?? 0) - otherQuantity);
            if (!available) return c;
            const key = cartKey(valid),
              old = c.find((x) => cartKey(x) === key);
            return old
              ? c.map((x) =>
                  cartKey(x) === key
                    ? {
                        ...x,
                        quantity: Math.min(available, x.quantity + valid.quantity),
                      }
                    : x,
                )
              : [...c, { ...valid, quantity: Math.min(available, valid.quantity) }];
          });
          setCartOpen(true);
          toast.success("Added to your bag");
        },
        remove: (key) => setCart((c) => c.filter((x) => cartKey(x) !== key)),
        update: (key, q) =>
          setCart((c) =>
            c
              .map((x) =>
                cartKey(x) === key
                  ? {
                      ...x,
                      quantity: Math.min(
                        Math.max(
                          0,
                          (catalogProducts?.find((p) => p.slug === x.slug)?.stock ?? 0) -
                            c
                              .filter((other) => other.slug === x.slug && cartKey(other) !== key)
                              .reduce((n, other) => n + other.quantity, 0),
                        ),
                        Math.max(1, q),
                      ),
                    }
                  : x,
              )
              .filter((item) => item.quantity > 0),
          ),
        toggleWish: (slug) => {
          if (!ready || auth.loading) return;
          if (auth.user) {
            const saved = !wishlist.includes(slug);
            const previous = wishlist;
            setAccountWishlist((current) =>
              saved
                ? current.includes(slug)
                  ? current
                  : [...current, slug]
                : current.filter((item) => item !== slug),
            );
            void auth
              .mutate("wishlist", { slug, saved })
              .then((next) => setAccountWishlist(next.wishlist))
              .catch((e) => {
                setAccountWishlist(previous);
                toast.error(e instanceof Error ? e.message : "Could not update wishlist");
              });
          } else
            setGuestWishlist((w) =>
              w.includes(slug) ? w.filter((s) => s !== slug) : [...w, slug],
            );
        },
        clear: () => setCart([]),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const s = useContext(Context);
  if (!s) throw new Error("Missing StoreProvider");
  return s;
}
