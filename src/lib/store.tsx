import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./auth";
import { cartKey, cartStock, validCart, readLocal, saveLocal, type CartItem } from "./cart";
export { cartKey, cartStock, validCart, readLocal, saveLocal, type CartItem } from "./cart";
interface Store {
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
  useEffect(() => {
    if (auth.loading) return;
    setCart(validCart(readLocal("sherise-cart-v2:" + namespace, [])));
    if (!signedIn) {
      const raw = readLocal<unknown>("sherise-guest-wishlist", []);
      setGuestWishlist(Array.isArray(raw) ? raw.filter((s) => typeof s === "string") : []);
    }
    setReady(true);
  }, [namespace, auth.loading, signedIn]);
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
        ready: ready && !auth.loading,
        cart,
        wishlist,
        cartOpen,
        searchOpen,
        setCartOpen,
        setSearchOpen,
        add: (item) => {
          if (!ready || auth.loading) return;
          const valid = validCart([item])[0];
          if (!valid) {
            toast.error("This selection is unavailable");
            return;
          }
          setCart((c) => {
            const key = cartKey(valid),
              old = c.find((x) => cartKey(x) === key);
            return old
              ? c.map((x) =>
                  cartKey(x) === key
                    ? { ...x, quantity: Math.min(cartStock(x), x.quantity + valid.quantity) }
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
              cartKey(x) === key ? { ...x, quantity: Math.min(cartStock(x), Math.max(1, q)) } : x,
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
