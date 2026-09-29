import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { emptyCustomerData, type CustomerData } from "./customer-types";
import { cartKey, cartStock, readLocal, saveLocal, validCart } from "./cart";
export class CustomerApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function customerRequest<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/customer/" + action, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Account service is unavailable. Please try again.");
  }
  if (!response.ok) throw new CustomerApiError(data.error || "Please try again.", response.status);
  return data as T;
}
type Auth = CustomerData & {
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  authenticate: (action: "register" | "login", body: unknown) => Promise<void>;
  mutate: (action: string, body: unknown) => Promise<CustomerData>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Auth | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CustomerData>(emptyCustomerData),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    try {
      const next = await customerRequest<CustomerData>("session");
      if (version === generation.current) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (version === generation.current) {
        setData(emptyCustomerData);
        setError(e instanceof Error ? e.message : "Account service unavailable");
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("sherise-auth") : null;
    if (channel) channel.onmessage = focus;
    return () => {
      window.removeEventListener("focus", focus);
      channel?.close();
    };
  }, [refresh]);
  const notify = () => {
    if (typeof BroadcastChannel !== "undefined") {
      const c = new BroadcastChannel("sherise-auth");
      c.postMessage("changed");
      c.close();
    }
  };
  async function authenticate(action: "register" | "login", body: unknown) {
    ++generation.current;
    let next = await customerRequest<CustomerData>(action, body);
    if (next.user) {
      const guestCart = validCart(readLocal("sherise-cart-v2:guest", []));
      const guestWishlist = readLocal<unknown>("sherise-guest-wishlist", []);
      const wishlistSlugs = Array.isArray(guestWishlist)
        ? guestWishlist.filter((slug): slug is string => typeof slug === "string")
        : [];
      const merged = validCart(readLocal("sherise-cart-v2:" + next.user.id, []));
      for (const item of guestCart) {
        const current = merged.find((other) => cartKey(other) === cartKey(item));
        if (current)
          current.quantity = Math.min(cartStock(current), current.quantity + item.quantity);
        else merged.push(item);
      }
      if (saveLocal("sherise-cart-v2:" + next.user.id, merged))
        saveLocal("sherise-cart-v2:guest", []);
      for (const slug of wishlistSlugs) {
        if (!next.wishlist.includes(slug)) {
          next = await customerRequest<CustomerData>("wishlist", { slug, saved: true });
        }
      }
      if (wishlistSlugs.length) saveLocal("sherise-guest-wishlist", []);
    }
    setData(next);
    setError("");
    setLoading(false);
    notify();
  }
  async function mutate(action: string, body: unknown) {
    const version = generation.current;
    try {
      const next = await customerRequest<CustomerData>(action, body);
      if (version === generation.current) setData(next);
      return next;
    } catch (e) {
      if (e instanceof CustomerApiError && e.status === 401) {
        setData(emptyCustomerData);
        notify();
      }
      throw e;
    }
  }
  async function logout() {
    await customerRequest("logout", {});
    ++generation.current;
    setData(emptyCustomerData);
    setError("");
    notify();
  }
  return (
    <AuthContext.Provider
      value={{ ...data, loading, error, refresh, authenticate, mutate, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is missing");
  return auth;
}
