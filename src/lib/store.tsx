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
    setCatalogError("");
    fetch(`/api/catalog/products?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(15000) })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check current products. Please refresh and try again.");
        const payload = await response.json() as { products?: Product[] };
        if (!Array.isArray(payload.products)) throw new Error("Could not check current products. Please refresh and try again.");
        if (!cancelled) {
          setCatalogProducts(payload.products);
        }
      })
      .catch((error) => { if (!cancelled) setCatalogError(error instanceof Error ? error.message : "Could not load products."); });
    return () => { cancelled = true; };
  }, [catalogAttempt]);
  useEffect(() => {
    if (auth.loading) return;
    const saved = validCart(readLocal("sherise-cart-v2:" + namespace, []), []);
    setCart(catalogProducts ? saved.map((item) => resolveCartSelection(item, catalogProducts.find((p) => p.slug === item.slug)).item) : saved);
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
        revise: (key, changes) => setCart((current) => current.map((item) => {
          if (cartKey(item) !== key) return item;
          return resolveCartSelection({ ...item, ...changes }, catalogProducts?.find((p) => p.slug === item.slug)).item;
        })),
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
            toast.error(`${product?.name || item.name || "Product"}: ${selection.issues.join(". ")}. Please choose options on the product page.`);
            return;
          }
          setCart((c) => {
            const key = cartKey(valid),
              old = c.find((x) => cartKey(x) === key);
            return old
              ? c.map((x) =>
                  cartKey(x) === key
                    ? { ...x, quantity: Math.min(product?.stock ?? 99, x.quantity + valid.quantity) }
                    : x,
                )
              : [...c, valid];
          });
          setCartOpen(true);
          toast.success("Added to your bag");
        },
        remove: (key) => setCart((c) => c.filter((x) => cartKey(x) !== key)),
        update: (key, q) =>
          setCart((c) =>
            c.map((x) =>
              cartKey(x) === key ? { ...x, quantity: Math.min(catalogProducts?.find((p) => p.slug === x.slug)?.stock ?? 99, Math.max(1, q)) } : x,
            ),
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
