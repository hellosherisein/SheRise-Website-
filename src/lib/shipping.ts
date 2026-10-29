import { useEffect, useState } from "react";
import type { CartItem } from "./cart";
export type ShippingQuote = {
  id: string;
  expiresAt: string;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  shippingAmount: number;
  codFee: number;
  donationAmount: number;
  total: number;
  carrierCost: number;
  codAvailable: boolean;
  codMinimum: number;
  codMaximum: number;
};
export function useShippingQuote(
  items: CartItem[],
  pin: string,
  payment: string,
  coupon: string,
  donationAmount: number,
) {
  const key = JSON.stringify({
    items: items.map(({ slug, size, flow, pack, quantity }) => ({
      slug,
      size,
      flow,
      pack,
      quantity,
    })),
    pin,
    payment,
    coupon,
    donationAmount,
  });
  const [state, setState] = useState<{
    key: string;
    quote: ShippingQuote | null;
    error: string;
    loading: boolean;
  }>({ key: "", quote: null, error: "", loading: false });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!/^[1-9][0-9]{5}$/.test(pin) || !items.length) return;
    const controller = new AbortController();
    setState({ key, quote: null, error: "", loading: true });
    const timer = setTimeout(() => {
      void fetch("/api/shipping/quote", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: key,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
      })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || "Could not verify delivery.");
          if (!controller.signal.aborted)
            setState({ key, quote: body.quote, error: "", loading: false });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({
              key,
              quote: null,
              error: error instanceof Error ? error.message : "Could not verify delivery.",
              loading: false,
            });
        });
    }, 400);
    const expiry = setTimeout(() => setRefresh((n) => n + 1), 240000);
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(expiry);
    };
  }, [key, refresh, pin, items.length]);
  return state.key === key ? state : { key, quote: null, error: "", loading: false };
}
