import { CustomerApiError } from "./auth";
import { siteConfig } from "./site-config";

export type PaymentResult = { confirmed: boolean; orderId: string; state: string; paymentId: string; amount: number };
type Checkout = { keyId: string; razorpayOrderId: string; orderId: string; amount: number; currency: string; confirmed: boolean; prefill: { name: string; email: string; contact: string } };
type RazorpayInstance = { open: () => void; close: () => void; on: (event: string, callback: () => void) => void };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance } }

export class PaymentFlowError extends Error {
  constructor(message: string, public orderId: string) { super(message); }
}

export async function paymentRequest<T>(action: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/payments/${action}`, {
    method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error("Payment service is unavailable. Please try again."); }
  if (!response.ok) throw new CustomerApiError(result.error || "Could not process your payment.", response.status);
  return result as T;
}

let script: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  script ??= new Promise<void>((resolve, reject) => {
    const element = document.createElement("script");
    element.src = "https://checkout.razorpay.com/v1/checkout.js";
    element.async = true;
    const timer = window.setTimeout(() => { element.remove(); reject(new Error("Payment window could not load. Please retry.")); }, 15000);
    element.onload = () => { window.clearTimeout(timer); window.Razorpay ? resolve() : reject(new Error("Payment window is unavailable.")); };
    element.onerror = () => { window.clearTimeout(timer); element.remove(); reject(new Error("Payment window could not load. Check your connection.")); };
    document.head.appendChild(element);
  }).catch((error) => { script = undefined; throw error; });
  return script;
}

export async function beginPayment(input: unknown): Promise<PaymentResult> {
  // Load the widget before creating a durable order; never send amounts supplied by the UI.
  await loadCheckout();
  const checkout = await paymentRequest<Checkout>("create-order", input);
  if (checkout.confirmed) return paymentRequest<PaymentResult>("status", { orderId: checkout.orderId });
  // Reconcile a captured payment after a closed tab/lost callback before asking to pay again.
  try {
    const status = await paymentRequest<PaymentResult>("status", { orderId: checkout.orderId });
    if (status.confirmed) return status;
    if (status.state === "authorized") throw new PaymentFlowError("Your payment is awaiting capture. Check again shortly instead of paying again.", checkout.orderId);
    if (status.state === "refunded") throw new PaymentFlowError("This payment was refunded. Please contact support.", checkout.orderId);
  } catch (error) {
    if (error instanceof PaymentFlowError || error instanceof CustomerApiError && [401, 403].includes(error.status)) throw error;
    // A transient reconciliation failure is not permission to collect another payment.
    throw new PaymentFlowError("Could not check the previous payment. Please retry shortly.", checkout.orderId);
  }
  return new Promise<PaymentResult>((resolve, reject) => {
    let finished = false;
    const widget = new window.Razorpay!({
      key: checkout.keyId, order_id: checkout.razorpayOrderId, amount: checkout.amount, currency: checkout.currency,
      name: siteConfig.businessName, description: `Order ${checkout.orderId}`, image: new URL(siteConfig.brandLogo, location.origin).href,
      prefill: checkout.prefill, theme: { color: "#f06c78" }, retry: { enabled: false },
      modal: { ondismiss: () => { if (!finished) { finished = true; reject(new PaymentFlowError("Payment was not completed. You can retry safely.", checkout.orderId)); } } },
      handler: async (response: Record<string, string>) => {
        if (finished) return;
        finished = true;
        try {
          let result = await paymentRequest<PaymentResult>("verify", response);
          for (let attempt = 0; !result.confirmed && !["failed", "refunded"].includes(result.state) && attempt < 5; attempt++) {
            await new Promise((done) => window.setTimeout(done, 2000));
            result = await paymentRequest<PaymentResult>("status", { orderId: checkout.orderId });
          }
          if (!result.confirmed) throw new PaymentFlowError("Payment confirmation is pending. Check My orders or retry shortly; your payment will be checked first.", checkout.orderId);
          resolve(result);
        } catch (error) { reject(new PaymentFlowError(error instanceof Error ? error.message : "Could not verify payment.", checkout.orderId)); }
      },
    });
    widget.on("payment.failed", () => {
      if (finished) return;
      finished = true;
      widget.close();
      reject(new PaymentFlowError("Payment failed. Please retry or choose another method.", checkout.orderId));
    });
    widget.open();
  });
}
