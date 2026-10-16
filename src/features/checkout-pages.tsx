import { useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "@/router-shim";
import { CheckCircle2, Clock } from "lucide-react";
import { useStore, cartKey, cartStock, readLocal, saveLocal, type CartItem } from "@/lib/store";
import { getProduct, money, products } from "@/lib/catalog";
import {
  PageHeading,
  EmptyState,
  QuantitySelector,
  ProductGrid,
  SectionHeading,
  Action,
} from "@/components/commerce";
import { useAuth, customerRequest, CustomerApiError } from "@/lib/auth";
import { calculateOrderTotals, FREE_SHIPPING_THRESHOLD, type CouponDiscount } from "@/lib/pricing";
import { AccountGate } from "./account-pages";
import type { CustomerOrder, Address } from "@/lib/customer-types";
import { Button } from "@/components/ui/button";
import fallbackProductImage from "@/assets/sherise-flatlay.jpg";
import { resolveCartSelection } from "@/lib/cart-selection";
import { beginPayment, PaymentFlowError } from "@/lib/payments";
export type DemoOrder = {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  payment: string;
};

type PublicCoupon = Exclude<CouponDiscount, boolean | null | undefined> & {
  code: string;
  description?: string;
  startsAt?: string;
  expiresAt?: string;
};

const COD_MINIMUM_TOTAL = 1000;
const paymentMethods = ["UPI", "Cards", "Net Banking", "Wallet", "Cash on Delivery"];

function useActiveCoupons() {
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/catalog/coupons?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { coupons: [] };
        return (await response.json()) as { coupons?: PublicCoupon[] };
      })
      .then((payload) => {
        if (!cancelled) {
          setCoupons(
            Array.isArray(payload.coupons)
              ? payload.coupons.filter((coupon) => coupon.code && coupon.discountValue > 0)
              : [],
          );
        }
      })
      .catch(() => {
        if (!cancelled) setCoupons([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return coupons;
}

function couponLabel(coupon: PublicCoupon) {
  const discount =
    coupon.discountType === "FIXED"
      ? `${money(coupon.discountValue)} off`
      : `${coupon.discountValue}% off`;
  const minimum = Number(coupon.minimumOrderAmount || 0);
  return `${discount}${minimum > 0 ? ` above ${money(minimum)}` : ""}`;
}

function couponAppliedMessage(coupon: PublicCoupon) {
  return `${coupon.code} applied: ${couponLabel(coupon)}.`;
}

export function Coupon({
  appliedCoupon,
  onApply,
  subtotal,
}: {
  appliedCoupon?: PublicCoupon | null;
  onApply: (coupon: PublicCoupon | null) => void;
  subtotal: number;
}) {
  const coupons = useActiveCoupons();
  const [code, setCode] = useState(appliedCoupon?.code || ""),
    [message, setMessage] = useState(appliedCoupon ? couponAppliedMessage(appliedCoupon) : "");

  function applyCoupon(nextCode = code) {
    const normalized = nextCode.trim().toUpperCase();
    const coupon = coupons.find((coupon) => coupon.code === normalized) || null;
    setCode(normalized);
    onApply(coupon && subtotal >= Number(coupon.minimumOrderAmount || 0) ? coupon : null);
    setMessage(
      coupon
        ? subtotal >= Number(coupon.minimumOrderAmount || 0)
          ? couponAppliedMessage(coupon)
          : `Minimum order ${money(Number(coupon.minimumOrderAmount || 0))} required.`
        : normalized
          ? "Coupon not active. You can enter another code manually."
          : "",
    );
  }

  return (
    <div className="my-5">
      <div className="mb-3 space-y-2">
        {coupons.map((coupon) => (
          <button
            key={coupon.code}
            type="button"
            className={`flex w-full items-center justify-between gap-3 border px-3 py-2 text-left text-sm ${
              code === coupon.code ? "border-brand-navy bg-brand-blush" : "border-[#eadbd2] bg-white"
            }`}
            onClick={() => applyCoupon(coupon.code)}
          >
            <span>
              <span className="font-bold text-brand-navy">{coupon.code}</span>
              <span className="block text-xs text-muted-foreground">{couponLabel(coupon)}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="size-4" />
              Active now
            </span>
          </button>
        ))}
      </div>
      <label className="field">
        Coupon code
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => {
              const nextCode = e.target.value.toUpperCase();
              setCode(nextCode);
              const coupon = coupons.find((coupon) => coupon.code === nextCode.trim()) || null;
              if (coupon && subtotal >= Number(coupon.minimumOrderAmount || 0)) {
                onApply(coupon);
                setMessage(couponAppliedMessage(coupon));
              } else {
                onApply(null);
                setMessage(nextCode.trim() ? "Manual code entered. Click Apply to check." : "");
              }
            }}
            placeholder="Enter coupon manually"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyCoupon();
              }
            }}
          />
          <Button type="button" variant="outline" size="lg" onClick={() => applyCoupon()}>
            Apply
          </Button>
        </div>
      </label>
      <p role="status" className={`mt-2 text-xs ${appliedCoupon ? "text-emerald-700" : "text-muted-foreground"}`}>
        {message}
      </p>
    </div>
  );
}
function Summary({ subtotal, discount, donationAmount = 0 }: { subtotal: number; discount: CouponDiscount; donationAmount?: number }) {
  const totals = calculateOrderTotals(subtotal, discount, donationAmount);
  return (
    <dl className="space-y-4">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd>{money(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Discount</dt>
        <dd>-{money(totals.discountAmount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Shipping</dt>
        <dd>{totals.shippingAmount ? money(totals.shippingAmount) : "Free"}</dd>
      </div>
      {donationAmount > 0 && (
        <div className="flex justify-between">
          <dt>Donation</dt>
          <dd>{money(donationAmount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t pt-4 text-xl font-bold">
        <dt>Total</dt>
        <dd>{money(totals.total)}</dd>
      </div>
      <p className="text-xs text-muted-foreground">
        Shipping is free on orders above {money(FREE_SHIPPING_THRESHOLD)}.
      </p>
    </dl>
  );
}
export function Cart() {
  const { cart, update, remove, catalogProducts } = useStore();
  const [discount, setDiscount] = useState<PublicCoupon | null>(null);
  const total = cart.reduce((a, i) => a + i.quantity * i.price, 0);
  return (
    <div className="container-shell section-space">
      <PageHeading title="Your bag" copy="A little care, ready when you are." />
      {!cart.length ? (
        <EmptyState title="Your bag is waiting" />
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="divide-y">
            {cart.map((i) => {
              const p = getProduct(i.slug);
              const productName = i.name || p?.name || titleFromSlug(i.slug);
              const productImage = i.image || p?.images[0] || fallbackProductImage;
              return (
                <article
                  key={cartKey(i)}
                  className="grid grid-cols-[80px_1fr] gap-4 py-6 sm:grid-cols-[110px_1fr_auto]"
                >
                  <img
                    src={productImage}
                    alt={productName + " placeholder"}
                    width="110"
                    height="110"
                    onError={(event) => {
                      event.currentTarget.src = fallbackProductImage;
                    }}
                  />
                  <div>
                    <Link
                      to="/products/$slug"
                      params={{ slug: i.slug }}
                      className="font-display text-xl"
                    >
                      {productName}
                    </Link>
                    <p className="my-3 text-sm">
                      {i.size} · {i.flow} · {i.pack}
                    </p>
                    <QuantitySelector
                      value={i.quantity}
                      max={catalogProducts?.find((p) => p.slug === i.slug)?.stock ?? cartStock(i)}
                      onChange={(q) => update(cartKey(i), q)}
                    />
                    <button onClick={() => remove(cartKey(i))} className="ml-4 text-xs underline">
                      Remove
                    </button>
                  </div>
                  <strong>{money(i.price * i.quantity)}</strong>
                </article>
              );
            })}
          </div>
          <aside className="border bg-brand-cream p-6">
            <h2 className="mb-6 text-2xl">Order summary</h2>
            <Summary subtotal={total} discount={discount} />
            <Coupon appliedCoupon={discount} onApply={setDiscount} subtotal={total} />
            <Button asChild size="lg" className="w-full">
              <Link to="/checkout" search={{ coupon: discount?.code }}>
                Continue to checkout
              </Link>
            </Button>
            <p className="mt-4 text-xs">Choose payment securely at checkout.</p>
          </aside>
        </div>
      )}
      <section className="mt-16">
        <SectionHeading title="You may also like" />
        <ProductGrid
          items={products.filter((p) => !cart.some((i) => i.slug === p.slug)).slice(0, 4)}
        />
      </section>
    </div>
  );
}
export function Checkout() {
  return (
    <AccountGate>
      <CustomerCheckout />
    </AccountGate>
  );
}
function CustomerCheckout() {
  const auth = useAuth();
  const [addressId, setAddressId] = useState(auth.addresses.find((a) => a.isDefault)?.id || "");
  const selectedAddress = auth.addresses.find((a) => a.id === addressId);
  const requestId = useRef(crypto.randomUUID());
  const lastCheckout = useRef("");
  const submitting = useRef(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments/config").then((response) => response.ok ? response.json() : { enabled: false })
      .then((result) => { if (!cancelled) setPaymentsEnabled(result.enabled === true); })
      .catch(() => { if (!cancelled) setPaymentsEnabled(false); });
    return () => { cancelled = true; };
  }, []);
  const { cart, clear, catalogProducts, catalogError, revise, remove, update, ready } = useStore();
  const invalidSelections = catalogProducts
    ? cart.filter((item) => resolveCartSelection(item, catalogProducts.find((p) => p.slug === item.slug)).issues.length)
    : [];
  const navigate = useNavigate();
  const coupons = useActiveCoupons();
  const [discount, setDiscount] = useState<PublicCoupon | null>(null),
    [payment, setPayment] = useState("UPI"),
    [donationAmount, setDonationAmount] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const couponCode = new URLSearchParams(location.search).get("coupon")?.toUpperCase() || "";
    if (!couponCode || !coupons.length) return;
    setDiscount(coupons.find((coupon) => coupon.code === couponCode) || null);
  }, [coupons]);
  const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const orderTotals = calculateOrderTotals(total, discount, donationAmount);
  const codAvailable = orderTotals.total >= COD_MINIMUM_TOTAL;
  useEffect(() => {
    if (codAvailable && payment !== "Cash on Delivery") setPayment("Cash on Delivery");
    if (!codAvailable && payment === "Cash on Delivery") setPayment("UPI");
  }, [codAvailable, payment]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || submitting.current) return;
    if (!ready || invalidSelections.length) {
      setError("Please review your bag options before placing the order.");
      return;
    }
    const f = new FormData(e.currentTarget);
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const address: Address = {
        id: selectedAddress?.id || crypto.randomUUID(),
        name: String(f.get("Full name")),
        phone: String(f.get("Phone")),
        line1: String(f.get("Address")),
        line2: String(f.get("Apartment (optional)") || ""),
        city: String(f.get("City")),
        state: String(f.get("State")),
        pin: String(f.get("PIN code")),
        label: selectedAddress?.label || "Home",
        isDefault: false,
      };
      const checkoutData = {
        requestId: requestId.current,
        address,
        items: cart.map(({ slug, size, flow, pack, quantity, price, name, image }) => ({
          slug,
          size,
          flow,
          pack,
          quantity,
          price,
          name: name || getProduct(slug)?.name || titleFromSlug(slug),
          image,
        })),
        coupon: discount?.code || "",
        donationAmount,
        payment,
      };
      const fingerprint = JSON.stringify({ ...checkoutData, requestId: "" });
      if (lastCheckout.current && lastCheckout.current !== fingerprint) requestId.current = crypto.randomUUID();
      try {
        const saved = JSON.parse(sessionStorage.getItem(`sherise-checkout:${auth.user?.id}`) || "null");
        if (saved?.fingerprint === fingerprint && /^[a-f0-9-]{36}$/i.test(saved.requestId)) requestId.current = saved.requestId;
        sessionStorage.setItem(`sherise-checkout:${auth.user?.id}`, JSON.stringify({ fingerprint, requestId: requestId.current }));
      } catch { /* Memory retry IDs still work when browser storage is disabled. */ }
      lastCheckout.current = fingerprint;
      checkoutData.requestId = requestId.current;
      let orderId: string;
      if (payment === "Cash on Delivery") {
        const { order } = await customerRequest<{ order: CustomerOrder }>("order-create", checkoutData);
        orderId = order.id;
      } else {
        if (!paymentsEnabled) throw new Error("Online payments are not available right now. Please try again later.");
        const result = await beginPayment(checkoutData);
        if (!result.confirmed) throw new Error("Your payment has not yet been confirmed.");
        orderId = result.orderId;
      }
      clear();
      try { sessionStorage.removeItem(`sherise-checkout:${auth.user?.id}`); } catch { /* Optional browser storage. */ }
      await auth.refresh();
      await navigate({ to: "/order-success", search: { order: orderId } });
    } catch (e) {
      if (e instanceof PaymentFlowError) {
        await navigate({ to: "/payment-failed", search: { order: e.orderId } });
        return;
      }
      if (e instanceof CustomerApiError && e.status === 401) await auth.refresh();
      setError(e instanceof Error ? e.message : "Could not save your order.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="container-shell section-space">
      <PageHeading
        title="A little care, on its way"
        copy="Confirm your delivery details and choose a secure payment method."
      />
      {!cart.length ? (
        <EmptyState title="Add something to your bag first" />
      ) : (
        <form
          key={addressId}
          onSubmit={submit}
          className="grid items-start gap-10 lg:grid-cols-[1.5fr_1fr]"
        >
          {(catalogError || !catalogProducts || invalidSelections.length > 0) && (
            <section className="space-y-4 border border-brand-coral bg-brand-cream p-5 lg:col-span-2" aria-label="Review bag options">
              <h2 className="text-xl">Review your bag</h2>
              <p role="status" className="text-sm">
                {catalogError || (!catalogProducts ? "Checking current products…" : "Some saved options are no longer available. Choose the current options below to continue.")}
              </p>
              {invalidSelections.map((item) => {
                const product = catalogProducts?.find((p) => p.slug === item.slug);
                const key = cartKey(item);
                return (
                  <div key={key} className="space-y-3 border-t pt-4">
                    <p className="font-semibold">{product?.name || item.name || titleFromSlug(item.slug)}</p>
                    {product ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {([
                            ["size", product.sizes], ["flow", product.flow], ["pack", product.packOptions.map((pack) => pack.label)],
                          ] as const).map(([field, options]) => (
                            <label key={field} className="field capitalize">
                              {field}
                              <select value={item[field]} onChange={(event) => revise(key, { [field]: event.target.value })} aria-label={`${product.name} ${field}`}>
                                {!options.includes(item[field]) && <option value={item[field]} disabled>{item[field]} (choose current option)</option>}
                                {options.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                        {item.quantity > product.stock && product.stock > 0 && (
                          <Button type="button" variant="outline" onClick={() => update(key, product.stock)}>Update quantity to {product.stock}</Button>
                        )}
                        {product.stock <= 0 && <p className="text-sm">Currently out of stock.</p>}
                      </>
                    ) : <p className="text-sm">This product is no longer available.</p>}
                    <button type="button" onClick={() => remove(key)} className="text-sm underline">Remove from bag</button>
                  </div>
                );
              })}
            </section>
          )}
          <div className="space-y-8">
            <section>
              <h2 className="mb-5 text-2xl">01 · Contact & delivery</h2>
              <label className="field mb-5">
                Choose a saved address
                <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                  <option value="">Use a new address</option>
                  {auth.addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}: {a.line1}, {a.city}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: "Full name", auto: "name" },
                  { name: "Phone", type: "tel", pattern: "[6-9][0-9]{9}", auto: "tel" },
                  { name: "Email", type: "email", auto: "email" },
                  { name: "Address", auto: "street-address" },
                  { name: "Apartment (optional)", optional: true, auto: "address-line2" },
                  { name: "City", auto: "address-level2" },
                  { name: "State", auto: "address-level1" },
                  { name: "PIN code", pattern: "[1-9][0-9]{5}", auto: "postal-code" },
                ].map((f) => (
                  <label key={f.name} className="field">
                    {f.name}
                    <input
                      required={!f.optional}
                      type={f.type || "text"}
                      name={f.name}
                      defaultValue={
                        f.name === "Full name"
                          ? selectedAddress?.name || auth.user?.name
                          : f.name === "Phone"
                            ? selectedAddress?.phone || auth.user?.phone
                            : f.name === "Email"
                              ? auth.user?.email
                              : f.name === "Address"
                                ? selectedAddress?.line1
                                : f.name === "Apartment (optional)"
                                  ? selectedAddress?.line2
                                  : f.name === "City"
                                    ? selectedAddress?.city
                                    : f.name === "State"
                                      ? selectedAddress?.state
                                      : f.name === "PIN code"
                                        ? selectedAddress?.pin
                                        : undefined
                      }
                      autoComplete={f.auto}
                      pattern={f.pattern}
                      minLength={f.type ? undefined : 2}
                      title={
                        f.name === "Phone"
                          ? "Enter a 10-digit Indian mobile number"
                          : f.name === "PIN code"
                            ? "Enter a 6-digit PIN code"
                            : undefined
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
            <section>
              <h2 className="mb-4 text-2xl">02 · Shipping method</h2>
              <label className="block border p-4">
                <input type="radio" defaultChecked name="shipping" /> Standard shipping · {orderTotals.shippingAmount ? money(orderTotals.shippingAmount) : "Free"}
                <p className="mt-2 text-xs">
                  Shipping is calculated in the order total. Free above {money(FREE_SHIPPING_THRESHOLD)}.
                </p>
              </label>
            </section>
            <section className="rounded-3xl border border-[#f0d8cf] bg-[#fffaf6] p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-serif text-xl font-semibold leading-tight text-[#7f1d2a] md:text-2xl">
                    Donate & Support Transformative Social Work In India
                  </h2>
                  <p className="mt-1 text-sm text-[#8b6f66]">
                    SheRise Welfare Foundation - NGO
                  </p>
                </div>
                <a
                  href="/about"
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#d9686e] px-4 py-2 text-sm font-semibold text-[#8f1f2d] transition hover:bg-[#fff1ed]"
                >
                  Know More
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-5">
                {[10, 20, 50, 80, 100].map((amount) => (
                  <label
                    key={amount}
                    className="relative w-24 cursor-pointer rounded-2xl border-2 border-[#efd9d0] bg-white px-4 py-3 text-center text-base font-semibold text-[#7f1d2a] transition hover:border-[#d9686e] hover:bg-[#fff1ed] has-[:checked]:border-[#8f1f2d] has-[:checked]:bg-[#fff1ed] has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#8f1f2d]"
                  >
                    <input
                      type="radio"
                      name="donationAmount"
                      value={amount}
                      checked={donationAmount === amount}
                      onChange={() => setDonationAmount(amount)}
                      disabled={busy}
                      className="peer sr-only"
                    />
                    ₹{amount}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#8b6f66]">
                <p role="status">
                  {donationAmount > 0
                    ? `${money(donationAmount)} donation added to your order.`
                    : "Optional: choose an amount to add to your order."}
                </p>
                {donationAmount > 0 && (
                  <button type="button" disabled={busy} onClick={() => setDonationAmount(0)} className="shrink-0 font-semibold text-[#8f1f2d] underline">
                    Remove donation
                  </button>
                )}
              </div>
            </section>
            <fieldset>
              <legend className="mb-4 text-2xl font-display">03 · Payment method</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {paymentMethods.map((m) => {
                  const disabled = codAvailable ? m !== "Cash on Delivery" : m === "Cash on Delivery";
                  return (
                  <label
                    key={m}
                    className={`border p-4 text-sm ${disabled ? "cursor-not-allowed opacity-50" : ""} ${payment === m ? "border-brand-navy bg-brand-blush" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === m}
                      disabled={disabled}
                      onChange={() => setPayment(m)}
                    />{" "}
                    {m}
                  </label>
                  );
                })}
              </div>
              <p className="mt-4 text-xs">
                {codAvailable
                  ? `Orders of ${money(COD_MINIMUM_TOTAL)} and above are Cash on Delivery only.`
                  : `Cash on Delivery is available only on orders of ${money(COD_MINIMUM_TOTAL)} and above.`}
              </p>
            </fieldset>
          </div>
          <aside className="border bg-brand-cream p-6">
            <h2 className="mb-5 text-2xl">Your order</h2>
            {cart.map((i) => (
              <div className="mb-4 flex justify-between gap-4 text-sm" key={cartKey(i)}>
                <span>
                  {i.name || getProduct(i.slug)?.name || titleFromSlug(i.slug)}
                  <small className="block">
                    {i.pack} · {i.size} · ×{i.quantity}
                  </small>
                </span>
                <span>{money(i.price * i.quantity)}</span>
              </div>
            ))}
            <Summary subtotal={total} discount={discount} donationAmount={donationAmount} />
            <Coupon appliedCoupon={discount} onApply={setDiscount} subtotal={total} />
            <label className="my-5 flex gap-2 text-xs leading-5">
              <input type="checkbox" required />
              <span>
                I agree to the order and payment{" "}
                <Link to="/terms" className="underline">
                  Terms
                </Link>
              </span>
            </label>
            {!codAvailable && !paymentsEnabled ? <p className="my-3 text-sm" role="status">Online payments are temporarily unavailable. Please try again later.</p> : null}
            <Button type="submit" size="lg" className="w-full" disabled={busy || !ready || invalidSelections.length > 0 || (!codAvailable && !paymentsEnabled)}>
              {busy ? "Processing..." : codAvailable ? "PLACE ORDER" : "PAY NOW"}
            </Button>
            <p role="alert" className="mt-3 text-sm">
              {error}
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}
export function OrderSuccess() {
  return (
    <AccountGate>
      <CustomerOrderSuccess />
    </AccountGate>
  );
}
function CustomerOrderSuccess() {
  const auth = useAuth();
  const [id, setId] = useState("");
  useEffect(() => setId(new URLSearchParams(location.search).get("order") || ""), []);
  const order = auth.orders.find((o) => o.id === id);
  return (
    <div className="container-shell section-space">
      {order ? (
        <div className="mx-auto max-w-xl border bg-brand-cream p-8 text-center">
          {order.payment === "RAZORPAY" && order.paymentStatus !== "SUCCESS" ? <Clock className="mx-auto mb-6 size-12 text-brand-navy" /> : <CheckCircle2 className="mx-auto mb-6 size-12 text-brand-navy" />}
          <h2 className="text-3xl">{order.payment === "RAZORPAY" && order.paymentStatus !== "SUCCESS" ? "Payment not confirmed" : `Thank you, ${auth.user?.name.split(" ")[0]}.`}</h2>
          <p className="my-5">
            {order.id} · {money(order.total)}
          </p>
          <p className="mb-7 text-sm leading-6">
            {order.payment === "RAZORPAY" ? order.paymentStatus === "SUCCESS" ? "Payment confirmed. You can track your order from My orders." : "Your order is saved, but payment is not confirmed. Check or retry your payment before placing another order." : "Your order is saved to your account. You can track status updates from My orders."}
          </p>
          <dl className="mb-6 space-y-2 text-sm">
            <div><dt className="inline font-medium">Payment status: </dt><dd className="inline">{order.paymentStatus || "PENDING"}</dd></div>
            {order.gatewayPaymentId ? <div><dt className="inline font-medium">Payment ID: </dt><dd className="inline break-all">{order.gatewayPaymentId}</dd></div> : null}
            {order.paidAt ? <div><dt className="inline font-medium">Paid at: </dt><dd className="inline">{new Date(order.paidAt).toLocaleString("en-IN")}</dd></div> : null}
          </dl>
          <ul className="mb-6 space-y-2 text-left text-sm">{order.items.map((item, index) => <li key={`${item.slug}-${index}`} className="flex justify-between gap-3"><span>{item.name} ×{item.quantity}</span><span>{money(item.price * item.quantity)}</span></li>)}</ul>
          {order.payment === "RAZORPAY" && !["SUCCESS", "REFUNDED"].includes(order.paymentStatus || "") ? <Action to={`/payment-failed?order=${encodeURIComponent(order.id)}`}>Check payment</Action> : null}
          <Action to="/account/orders">View my orders</Action>
        </div>
      ) : (
        <EmptyState
          title="Order not found"
          copy="Find your saved orders in your account dashboard."
        />
      )}
    </div>
  );
}

export function PaymentFailed() {
  return <AccountGate><CustomerPaymentFailed /></AccountGate>;
}

function CustomerPaymentFailed() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { cart, clear } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const retrying = useRef(false);
  const orderId = new URLSearchParams(location.search).get("order") || "";
  async function retry() {
    if (busy || retrying.current || !orderId) return;
    retrying.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await beginPayment({ orderId });
      if (!result.confirmed) throw new Error("Payment is still pending. Please check again shortly.");
      const order = auth.orders.find((item) => item.id === result.orderId);
      const keys = (items: Array<{ slug: string; size: string; flow: string; pack: string; quantity: number; price: number }>) => items.map((item) => `${cartKey(item)}:${item.quantity}`).sort().join("|");
      if (order && keys(order.items) === keys(cart)) clear();
      try { sessionStorage.removeItem(`sherise-checkout:${auth.user?.id}`); } catch { /* Optional browser storage. */ }
      await auth.refresh();
      await navigate({ to: "/order-success", search: { order: result.orderId } });
    } catch (error) { setError(error instanceof Error ? error.message : "Could not confirm payment."); }
    finally { retrying.current = false; setBusy(false); }
  }
  return <div className="container-shell section-space"><div className="mx-auto max-w-xl border bg-brand-cream p-8">
    <h1 className="text-3xl">Payment not completed</h1>
    <p className="my-5 text-sm leading-6">Your payment has not been confirmed here. If money was debited, check payment first. We verify an earlier payment before opening a new payment window.</p>
    {orderId ? <p className="mb-4 break-all text-sm">Order: {orderId}</p> : null}
    <div className="flex flex-wrap gap-3"><Button disabled={busy || !orderId} onClick={retry}>{busy ? "Checking payment..." : "Check / Retry Payment"}</Button><Action to="/checkout" outline>Back to checkout</Action><Action to="/account/orders" outline>My orders</Action></div>
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
  </div></div>;
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
