import { useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "@/router-shim";
import { CheckCircle2 } from "lucide-react";
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
import { useAuth, customerRequest } from "@/lib/auth";
import { calculateOrderTotals, FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { AccountGate } from "./account-pages";
import type { CustomerOrder, Address } from "@/lib/customer-types";
import { Button } from "@/components/ui/button";
import fallbackProductImage from "@/assets/sherise-flatlay.jpg";
export type DemoOrder = {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  payment: string;
};

const activeCoupons = [
  {
    code: "RISE10",
    label: "10% off preview order",
    detail: "Active now",
  },
];
const COD_MINIMUM_TOTAL = 1000;
const paymentMethods = ["UPI", "Cards", "Net Banking", "Wallet", "Cash on Delivery"];

export function Coupon({
  applied = false,
  onApply,
}: {
  applied?: boolean;
  onApply: (v: boolean) => void;
}) {
  const [code, setCode] = useState(applied ? activeCoupons[0]?.code || "" : ""),
    [message, setMessage] = useState(applied ? "Coupon active: 10% off." : "");

  function applyCoupon(nextCode = code) {
    const normalized = nextCode.trim().toUpperCase();
    const valid = activeCoupons.some((coupon) => coupon.code === normalized);
    setCode(normalized);
    onApply(valid);
    setMessage(
      valid
        ? "Coupon active: 10% off."
        : normalized
          ? "Coupon not active. You can enter another code manually."
          : "",
    );
  }

  return (
    <form className="my-5" onSubmit={(e) => {
      e.preventDefault();
      applyCoupon();
    }}>
      <div className="mb-3 space-y-2">
        {activeCoupons.map((coupon) => (
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
              <span className="block text-xs text-muted-foreground">{coupon.label}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="size-4" />
              {coupon.detail}
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
              if (activeCoupons.some((coupon) => coupon.code === nextCode.trim())) {
                onApply(true);
                setMessage("Coupon active: 10% off.");
              } else {
                onApply(false);
                setMessage(nextCode.trim() ? "Manual code entered. Click Apply to check." : "");
              }
            }}
            placeholder="Enter coupon manually"
          />
          <Button type="submit" variant="outline" size="lg">
            Apply
          </Button>
        </div>
      </label>
      <p role="status" className={`mt-2 text-xs ${applied ? "text-emerald-700" : "text-muted-foreground"}`}>
        {message}
      </p>
    </form>
  );
}
function Summary({ subtotal, discount }: { subtotal: number; discount: boolean }) {
  const totals = calculateOrderTotals(subtotal, discount);
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
  const { cart, update, remove } = useStore();
  const [discount, setDiscount] = useState(false);
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
                      max={cartStock(i)}
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
            <Coupon applied={discount} onApply={setDiscount} />
            <Button asChild size="lg" className="w-full">
              <Link to="/checkout" search={{ coupon: discount ? "RISE10" : undefined }}>
                Continue to checkout
              </Link>
            </Button>
            <p className="mt-4 text-xs">Preview only. No payment is collected.</p>
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
  const { cart, clear } = useStore();
  const navigate = useNavigate();
  const [discount, setDiscount] = useState(false),
    [payment, setPayment] = useState("UPI"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setDiscount(new URLSearchParams(location.search).get("coupon") === "RISE10");
  }, []);
  const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const orderTotals = calculateOrderTotals(total, discount);
  const codAvailable = orderTotals.total >= COD_MINIMUM_TOTAL;
  useEffect(() => {
    if (codAvailable && payment !== "Cash on Delivery") setPayment("Cash on Delivery");
    if (!codAvailable && payment === "Cash on Delivery") setPayment("UPI");
  }, [codAvailable, payment]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
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
      const { order } = await customerRequest<{ order: CustomerOrder }>("order-create", {
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
        coupon: discount ? "RISE10" : "",
        payment,
      });
      clear();
      await auth.refresh();
      await navigate({ to: "/order-success", search: { order: order.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your order.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container-shell section-space">
      <PageHeading
        title="A little care, on its way"
        copy="Your order will be saved to your customer account. The current catalog is a preview: no payment or shipment is processed."
      />
      {!cart.length ? (
        <EmptyState title="Add something to your bag first" />
      ) : (
        <form
          key={addressId}
          onSubmit={submit}
          className="grid items-start gap-10 lg:grid-cols-[1.5fr_1fr]"
        >
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
                <input type="radio" defaultChecked name="shipping" /> Standard shipping · ?40
                <p className="mt-2 text-xs">
                  Shipping is calculated in the order total. Free above {money(FREE_SHIPPING_THRESHOLD)}.
                </p>
              </label>
            </section>
            <fieldset>
              <legend className="mb-4 text-2xl font-display">03 · Payment method preview</legend>
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
            <Summary subtotal={total} discount={discount} />
            <Coupon applied={discount} onApply={setDiscount} />
            <label className="my-5 flex gap-2 text-xs leading-5">
              <input type="checkbox" required />
              <span>
                I understand this order will be saved to my account, without online payment or
                shipment confirmation.{" "}
                <Link to="/terms" className="underline">
                  Terms
                </Link>
              </span>
            </label>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Placing..." : "PLACE ORDER"}
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
          <CheckCircle2 className="mx-auto mb-6 size-12 text-brand-navy" />
          <h2 className="text-3xl">Thank you, {auth.user?.name.split(" ")[0]}.</h2>
          <p className="my-5">
            {order.id} · {money(order.total)}
          </p>
          <p className="mb-7 text-sm leading-6">
            Your order is saved to your account. You can track status updates from My orders.
          </p>
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

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
