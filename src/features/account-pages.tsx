import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@/router-shim";
import {
  UserRound,
  Package,
  MapPin,
  Heart,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  ArrowRight,
  Check,
  Mail,
  Phone,
  Flower2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeading, EmptyState, ProductGrid } from "@/components/commerce";
import { useAuth, customerRequest } from "@/lib/auth";
import type { Address, CustomerOrder, OrderReview } from "@/lib/customer-types";
import { products, money, getProduct, type Product } from "@/lib/catalog";
import { calculateOrderTotals } from "@/lib/pricing";
import fallbackProductImage from "@/assets/sherise-flatlay.jpg";
const message = (e: unknown) => (e instanceof Error ? e.message : "Please try again.");
export function PasswordField({
  label = "Password",
  name = "password",
  confirm = false,
}: {
  label?: string;
  name?: string;
  confirm?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      {label}
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          minLength={name === "currentPassword" ? 1 : 10}
          maxLength={128}
          autoComplete={confirm ? "new-password" : "current-password"}
          className="!pr-12"
        />
        <button
          type="button"
          aria-label={show ? "Hide " + label : "Show " + label}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
export function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "forgot-password" | "reset-password";
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [remember, setRemember] = useState(false);
  const register = mode === "register",
    login = mode === "login";
  useEffect(() => {
    if (auth.user && (login || register)) {
      const next = new URLSearchParams(location.search).get("next");
      void navigate({ to: next === "/checkout" ? "/checkout" : "/account" });
    }
  }, [auth.user, login, register, navigate]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const f = new FormData(e.currentTarget);
    const value = (key: string) => String(f.get(key) || "");
    if ((register || mode === "reset-password") && value("password") !== value("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (login || register) {
        await auth.authenticate(mode, {
          ...(register
            ? {
                name: value("name"),
                email: value("email"),
                phone: value("phone"),
                whatsappNumber: value("whatsappNumber"),
              }
            : { identifier: value("identifier") }),
          password: value("password"),
          remember,
        });
        const next = new URLSearchParams(location.search).get("next");
        await navigate({ to: next === "/checkout" ? "/checkout" : "/account" });
      } else {
        const result = await customerRequest<{ message: string }>(
          mode,
          mode === "forgot-password"
            ? { email: value("email") }
            : {
                token: new URLSearchParams(location.search).get("token"),
                password: value("password"),
              },
        );
        setSuccess(result.message);
        e.currentTarget?.reset();
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (auth.loading)
    return (
      <div className="container-shell section-space" role="status">
        Opening your secure account…
      </div>
    );
  return (
    <div className="auth-page-shell container-shell py-10 md:py-16">
      <div className="auth-panel">
        <aside className="auth-story">
          <p className="eyebrow">YOUR LITTLE SPACE OF CARE</p>
          <h1>
            {register
              ? "Welcome to your circle."
              : login
                ? "Good to have you back."
                : "A fresh start, just for you."}
          </h1>
          <p className="mt-6 leading-7 opacity-80">
            Your essentials. Your favourites. Your everyday care — all together in your SheRise
            account.
          </p>
          <Flower2 className="my-12 size-24 opacity-40" strokeWidth={1} />
          <ul className="space-y-5 text-sm">
            <li className="flex gap-3">
              <Package size={19} />
              All your orders, in one place
            </li>
            <li className="flex gap-3">
              <MapPin size={19} />
              Saved addresses for an easier checkout
            </li>
            <li className="flex gap-3">
              <Heart size={19} />A wishlist that stays with you
            </li>
          </ul>
        </aside>
        <div className="auth-form-panel p-6 sm:p-10 lg:p-14">
          <p className="eyebrow">RELEASE. RENEW & RISE.</p>
          <h2 className="text-3xl text-brand-navy">
            {register
              ? "Create your account"
              : login
                ? "Login to SheRise"
                : mode === "forgot-password"
                  ? "Forgot your password?"
                  : "Choose a new password"}
          </h2>
          <p className="mb-8 mt-3 text-sm text-muted-foreground">
            {register
              ? "A few details, and you’re part of the circle."
              : login
                ? "Enter your email or mobile number and password."
                : mode === "forgot-password"
                  ? "We’ll send a reset link to your registered email."
                  : "Use at least 10 characters for your new password."}
          </p>
          <form className="space-y-5" onSubmit={submit}>
            {register && (
              <>
                <label className="field">
                  Full name
                  <input
                    required
                    name="name"
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Your full name"
                  />
                </label>
                <label className="field">
                  Mobile number
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                  />
                </label>
                <label className="field">
                  WhatsApp number
                  <input
                    required
                    name="whatsappNumber"
                    type="tel"
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    autoComplete="tel"
                    placeholder="10-digit WhatsApp number"
                  />
                </label>
              </>
            )}
            {mode !== "reset-password" && (
              <label className="field">
                {login ? "Email or mobile number" : "Email address"}
                <input
                  required
                  name={login ? "identifier" : "email"}
                  type={login ? "text" : "email"}
                  maxLength={254}
                  autoComplete={login ? "username" : "email"}
                  placeholder={login ? "Email or 10-digit mobile number" : "you@example.com"}
                />
              </label>
            )}
            {mode !== "forgot-password" && <PasswordField confirm={!login} />}
            {(register || mode === "reset-password") && (
              <>
                <PasswordField name="confirm" label="Confirm password" confirm />
                <p className="text-xs text-muted-foreground">
                  Use at least 10 characters. A longer passphrase works well.
                </p>
              </>
            )}
            {login && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me for 30 days
                </label>
                <Link className="text-brand-burgundy underline" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>
            )}
            {register && (
              <label className="flex items-start gap-2 text-xs leading-6">
                <input className="mt-1.5" type="checkbox" required />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" className="underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy-policy" className="underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="form-success">
                {success}
              </p>
            )}
            <Button disabled={busy || !!success} type="submit" size="lg" className="w-full">
              {busy
                ? "Please wait…"
                : register
                  ? "CREATE ACCOUNT"
                  : login
                    ? "LOGIN"
                    : mode === "forgot-password"
                      ? "SEND RESET LINK"
                      : "RESET PASSWORD"}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="mt-7 text-center text-sm">
            {login ? "New to SheRise? " : register ? "Already part of the circle? " : ""}
            <Link
              to={login ? "/register" : "/login"}
              className="font-semibold text-brand-burgundy underline"
            >
              {login ? "Create an account" : "Login to your account"}
            </Link>
          </p>
          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={16} />
            Your personal space, securely protected.
          </p>
        </div>
      </div>
    </div>
  );
}
export function AccountGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!auth.loading && !auth.user && !auth.error) {
      const isCheckout = location.pathname === "/checkout";
      void navigate({
        to: "/login",
        ...(isCheckout ? { search: { next: "/checkout" } } : {}),
        replace: true,
      });
    }
  }, [auth.loading, auth.user, auth.error, navigate]);
  if (auth.loading)
    return (
      <div className="container-shell section-space" role="status">
        <div className="h-10 w-56 animate-pulse bg-brand-blush" />
        <p className="mt-6">Opening your account…</p>
      </div>
    );
  if (auth.error)
    return (
      <div className="container-shell section-space">
        <p role="alert" className="form-error">
          {auth.error}
        </p>
        <Button onClick={() => void auth.refresh()}>Try again</Button>
      </div>
    );
  if (!auth.user) return <div className="container-shell section-space">Redirecting to login…</div>;
  return <>{children}</>;
}
export function AccountPage({ section = "overview" }: { section?: string }) {
  return (
    <AccountGate>
      <AccountDashboard section={section} />
    </AccountGate>
  );
}
function AccountDashboard({ section }: { section: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(""),
    [orderSearch, setOrderSearch] = useState("");
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const user = auth.user!;
  const tabs = [
    { label: "Overview", to: "/account", id: "overview", Icon: UserRound },
    { label: "My orders", to: "/account/orders", id: "orders", Icon: Package },
    { label: "Profile information", to: "/account/profile", id: "profile", Icon: UserRound },
    { label: "Manage addresses", to: "/account/addresses", id: "addresses", Icon: MapPin },
    { label: "My wishlist", to: "/account/wishlist", id: "wishlist", Icon: Heart },
    { label: "Login & security", to: "/account/security", id: "security", Icon: ShieldCheck },
  ];
  useEffect(() => {
    if (section !== "orders") return;
    let cancelled = false;
    fetch("/api/catalog/products")
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { products?: Product[] };
        if (!cancelled) setLiveProducts(Array.isArray(payload.products) ? payload.products : []);
      })
      .catch(() => {
        if (!cancelled) setLiveProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);
  const productImageFor = (slug?: string, savedImage?: string) => {
    if (!slug) return savedImage || fallbackProductImage;
    const liveProduct = liveProducts.find((p) => p.slug === slug);
    return liveProduct?.images[0] || savedImage || getProduct(slug)?.images[0] || fallbackProductImage;
  };
  async function update(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setSaved("");
    setBusy(true);
    try {
      if (section === "security") {
        if (f.get("password") !== f.get("confirm")) throw new Error("Passwords do not match.");
        await customerRequest("password", {
          currentPassword: f.get("currentPassword"),
          password: f.get("password"),
        });
        await auth.refresh();
        await navigate({ to: "/login" });
      } else {
        await auth.mutate("profile", {
          name: f.get("name"),
          phone: f.get("phone"),
          whatsappNumber: f.get("whatsappNumber"),
        });
        setSaved("Your profile has been updated.");
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-background">
      <div className="container-shell py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <Link to="/">Home</Link> / My account
        </nav>
        <div className="account-layout">
          <aside>
            <div className="account-greeting">
              <span className="account-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <p className="text-xs text-muted-foreground">Hello,</p>
                <p className="mt-1 font-semibold">{user.name}</p>
              </div>
            </div>
            <nav aria-label="Account" className="account-nav">
              {tabs.map(({ label, to, id, Icon }) => (
                <Link
                  key={id}
                  to={to}
                  aria-current={section === id ? "page" : undefined}
                  className={section === id ? "selected" : ""}
                >
                  <Icon size={19} />
                  {label}
                  <ChevronRight size={15} className="ml-auto" />
                </Link>
              ))}
              <button
                onClick={async () => {
                  try {
                    await auth.logout();
                    await navigate({ to: "/login" });
                  } catch (e) {
                    setError(message(e));
                  }
                }}
              >
                <LogOut size={19} />
                Log out
              </button>
            </nav>
            <div className="mt-5 hidden border border-dashed p-5 text-sm lg:block">
              <Flower2 className="mb-3 text-brand-burgundy" />
              <p className="font-display text-xl">Made for your everyday.</p>
              <Link to="/shop" className="mt-3 inline-block text-xs underline">
                Explore your essentials ?
              </Link>
            </div>
          </aside>
          <section className="min-w-0">
            <div className="account-content">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">YOUR SHERISE SPACE</p>
                  <h1 className="text-3xl text-brand-navy md:text-4xl">
                    {tabs.find((t) => t.id === section)?.label || "My account"}
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {section === "overview"
                      ? "A little care, organised around you."
                      : section === "orders"
                        ? "Find every order and its latest status here."
                        : section === "addresses"
                          ? "Your go-to places, saved for next time."
                          : section === "security"
                            ? "Keep your account protected with a strong password."
                            : "Your details, just the way you like them."}
                  </p>
                </div>
              </div>
              {error && (
                <p role="alert" className="form-error mb-5">
                  {error}
                </p>
              )}
              {saved && (
                <p role="status" className="form-success mb-5">
                  {saved}
                </p>
              )}
              {section === "overview" && (
                <>
                  <div className="dashboard-welcome">
                    <h2 className="text-2xl">Welcome back, {user.name.split(" ")[0]}.</h2>
                    <p className="mt-2 max-w-md text-sm leading-6">
                      Pick up where you left off. Your favourites and everyday essentials are right
                      here.
                    </p>
                    <Button asChild className="mt-5">
                      <Link to="/shop">
                        Continue shopping <ArrowRight size={16} />
                      </Link>
                    </Button>
                  </div>
                  <div className="my-6 grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Orders",
                        count: auth.orders.length,
                        to: "/account/orders",
                        Icon: Package,
                      },
                      {
                        label: "Wishlist",
                        count: auth.wishlist.length,
                        to: "/account/wishlist",
                        Icon: Heart,
                      },
                      {
                        label: "Addresses",
                        count: auth.addresses.length,
                        to: "/account/addresses",
                        Icon: MapPin,
                      },
                    ].map(({ label, count, to, Icon }) => (
                      <Link to={to} key={label} className="dashboard-stat">
                        <Icon size={21} />
                        <strong>{count}</strong>
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>
                  <h2 className="mb-5 text-2xl">Recent orders</h2>
                  {auth.orders.length ? (
                    auth.orders.slice(0, 2).map((o) => {
                      const fallbackTotals = calculateOrderTotals(o.subtotal, o.discount > 0);
                      return (
                        <Link
                          key={o.id}
                          to="/account/orders"
                          className="mb-3 flex flex-wrap justify-between gap-3 border p-4 text-sm"
                        >
                          <span>
                            {o.id}
                            <small className="mt-1 block text-muted-foreground">
                              {new Date(o.createdAt).toLocaleDateString("en-IN")}
                            </small>
                          </span>
                          <span>
                            {money(o.total ?? fallbackTotals.total)}
                            <small className="mt-1 block capitalize">
                              {o.status === "preview" ? "Preview saved" : o.status}
                            </small>
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="Your first order starts here"
                      copy="Find the essentials that fit your flow."
                    />
                  )}
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div className="border p-5">
                      <h2 className="mb-3 text-xl">Your contact details</h2>
                      <p className="break-all text-sm">{user.email}</p>
                      {user.phone ? <p className="mt-2 text-sm">+91 {user.phone}</p> : null}
                      {user.whatsappNumber ? (
                        <p className="mt-2 text-sm">WhatsApp: +91 {user.whatsappNumber}</p>
                      ) : null}
                      <Link to="/account/profile" className="mt-4 inline-block text-xs underline">
                        Manage profile
                      </Link>
                    </div>
                    <div className="border p-5">
                      <h2 className="mb-3 text-xl">Default address</h2>
                      <p className="text-sm leading-6">
                        {auth.addresses.find((a) => a.isDefault)?.line1 ||
                          "Add an address for a quicker checkout."}
                      </p>
                      <Link to="/account/addresses" className="mt-4 inline-block text-xs underline">
                        Manage addresses
                      </Link>
                    </div>
                  </div>
                </>
              )}
              {(section === "profile" || section === "security") && (
                <form className="max-w-xl space-y-6" onSubmit={update} key={user.id + section}>
                  {section === "profile" ? (
                    <>
                      <label className="field">
                        Full name
                        <input
                          required
                          name="name"
                          defaultValue={user.name}
                          minLength={2}
                          maxLength={80}
                          autoComplete="name"
                        />
                      </label>
                      <label className="field">
                        Email address
                        <input type="email" value={user.email} readOnly className="!bg-muted" />
                        <span className="text-xs font-normal text-muted-foreground">
                          Your email is your account identifier. Contact support if it needs
                          changing.
                        </span>
                      </label>
                      <label className="field">
                        Mobile number
                        <input
                          name="phone"
                          defaultValue={user.phone}
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          type="tel"
                          autoComplete="tel"
                        />
                      </label>
                      <label className="field">
                        WhatsApp number
                        <input
                          required
                          name="whatsappNumber"
                          defaultValue={user.whatsappNumber || ""}
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          type="tel"
                          autoComplete="tel"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <PasswordField name="currentPassword" label="Current password" />
                      <PasswordField label="New password" confirm />
                      <PasswordField name="confirm" label="Confirm new password" confirm />
                      <p className="text-xs leading-6 text-muted-foreground">
                        Changing your password signs out all sessions. Sign in again with your new
                        password.
                      </p>
                    </>
                  )}
                  <Button type="submit" size="lg" disabled={busy}>
                    {busy ? "Saving…" : section === "security" ? "Change password" : "Save changes"}
                  </Button>
                </form>
              )}
              {section === "addresses" && <AddressManager />}
              {section === "wishlist" &&
                (auth.wishlist.length ? (
                  <AccountWishlistGrid wishlist={auth.wishlist} />
                ) : (
                  <EmptyState
                    title="Keep your favourites close"
                    copy="Tap a heart on any product to save it to your account."
                  />
                ))}
              {section === "orders" && (
                <>
                  <label className="field mb-6">
                    Search your orders
                    <input
                      type="search"
                      placeholder="Order ID or product name"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </label>
                  {auth.orders.length ? (
                    auth.orders
                      .filter((o) =>
                        (o.id + " " + o.items.map((i) => i.name).join(" "))
                          .toLowerCase()
                          .includes(orderSearch.toLowerCase()),
                      )
                      .map((o) => {
                        const firstItem = o.items[0];
                        const firstImage = productImageFor(firstItem?.slug, firstItem?.image);
                        const totalQuantity = o.items.reduce((sum, item) => sum + item.quantity, 0);
                        const fallbackTotals = calculateOrderTotals(o.subtotal, o.discount > 0);
                        const shippingAmount = o.shippingAmount ?? fallbackTotals.shippingAmount;
                        const orderTotal = o.total ?? fallbackTotals.total;

                        return (
                          <article key={o.id} className="order-card order-card-modern">
                            <header className="order-card-modern__status">
                              <div className={`order-status-icon order-status-icon--${o.status}`}>
                                <Package size={24} />
                                <Check size={14} />
                              </div>
                              <div>
                                <p className={`order-state order-state--${o.status}`}>
                                  {orderStatusLabel(o.status)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {orderStatusDate(o.status, o.createdAt, o.cancelledAt)}
                                </p>
                              </div>
                              <div className="ml-auto text-right">
                                <p className="text-xs text-muted-foreground">{o.id}</p>
                                <p className="mt-1 font-semibold text-brand-navy">{money(orderTotal)}</p>
                              </div>
                            </header>

                            <div className="order-product-panel">
                              <img
                                src={firstImage}
                                alt={firstItem?.name || "Order product"}
                                width="82"
                                height="82"
                                className="order-product-panel__image"
                                onError={(event) => {
                                  event.currentTarget.src = fallbackProductImage;
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase text-brand-burgundy">
                                  SheRise
                                </p>
                                <Link
                                  to="/products/$slug"
                                  params={{ slug: firstItem?.slug || "sherise-20-count-organic-sanitary-pads" }}
                                  className="mt-1 block truncate font-semibold text-brand-navy"
                                >
                                  {firstItem?.name || "SheRise order"}
                                </Link>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {firstItem
                                    ? `${firstItem.size} · ${firstItem.flow} · ${firstItem.pack}`
                                    : "Order items"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {o.items.length} product{o.items.length === 1 ? "" : "s"} · Qty {totalQuantity}
                                </p>
                              </div>
                              <details className="order-detail-dropdown">
                                <summary aria-label="View order details">
                                  <ChevronRight size={24} />
                                </summary>
                                <div className="order-detail-dropdown__body">
                                  <OrderTracking
                                    status={o.status}
                                    createdAt={o.createdAt}
                                    cancellationReason={o.cancellationReason}
                                  />
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="order-detail-box">
                                      <p className="text-xs font-bold uppercase text-muted-foreground">
                                        Delivery Details
                                      </p>
                                      <p className="mt-2 font-semibold">
                                        {o.address.name} · {o.address.phone}
                                      </p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {o.address.line1}, {o.address.line2} {o.address.city},{" "}
                                        {o.address.state} — {o.address.pin}
                                      </p>
                                    </div>
                                    <div className="order-detail-box">
                                      <p className="text-xs font-bold uppercase text-muted-foreground">
                                        Order Summary
                                      </p>
                                      <p className="mt-2 text-sm">
                                        Subtotal {money(o.subtotal)} · Discount {money(o.discount)}
                                      </p>
                                      <p className="mt-1 text-sm">
                                        Shipping {shippingAmount ? money(shippingAmount) : "Free"}
                                      </p>
                                      <p className="mt-1 text-sm">Payment: {o.payment}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        No payment collected in preview mode.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-4 space-y-3">
                                    {o.items.map((item, index) => (
                                      <div className="flex gap-3 border-t border-[#eadbd2] pt-3" key={`${item.slug}-${index}`}>
                                        <img
                                          src={productImageFor(item.slug, item.image)}
                                          alt={item.name}
                                          width="52"
                                          height="52"
                                          className="size-14 object-cover"
                                          onError={(event) => {
                                            event.currentTarget.src = fallbackProductImage;
                                          }}
                                        />
                                        <div>
                                          <p className="text-sm font-semibold">{item.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {item.size} · {item.flow} · {item.pack} · Qty {item.quantity}
                                          </p>
                                          <p className="text-xs">{money(item.price * item.quantity)}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </details>
                            </div>

                            {o.status === "delivered" ? <OrderReviewControl order={o} /> : null}
                            {canCancelOrder(o.status) ? <CancelOrderControl orderId={o.id} /> : null}
                          </article>
                        );
                      })
                  ) : (
                    <EmptyState
                      title="No orders yet"
                      copy="Your orders will appear here once you check out."
                    />
                  )}
                  {auth.orders.length > 0 &&
                    !auth.orders.some((o) =>
                      (o.id + " " + o.items.map((i) => i.name).join(" "))
                        .toLowerCase()
                        .includes(orderSearch.toLowerCase()),
                    ) && <p>No orders match your search.</p>}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function OrderTracking({
  status,
  createdAt,
  cancellationReason,
}: {
  status: CustomerOrder["status"];
  createdAt: string;
  cancellationReason?: string;
}) {
  const stages = [
    { key: "preview", label: "Order placed", helper: "Saved to your account" },
    { key: "packed", label: "Packed", helper: "Packet being prepared" },
    { key: "shipped", label: "Shipped", helper: "Handed to courier" },
    { key: "delivered", label: "Delivered", helper: "Reached your address" },
  ] as const;
  const currentIndex =
    status === "cancelled" ? 0 : Math.max(0, stages.findIndex((stage) => stage.key === status));
  const placedDate = new Date(createdAt);

  if (status === "cancelled") {
    return (
      <section className="mb-5 border border-red-200 bg-red-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-red-700">Order Cancelled</p>
            <h3 className="mt-1 text-lg font-semibold text-red-900">
              This order has been cancelled.
            </h3>
            <p className="mt-2 text-sm text-red-800">
              Reason: {cancellationReason || "Not specified"}
            </p>
          </div>
          <span className="order-status">Cancelled</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5 border border-[#eadbd2] bg-[#fffaf6] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">Order Tracking</p>
          <h3 className="mt-1 text-lg font-semibold">
            {status === "cancelled" ? "Order cancelled" : stages[currentIndex]?.label}
          </h3>
        </div>
        <span className="order-status">
          {orderStatusLabel(status)}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {stages.map((stage, index) => {
          const done = status !== "cancelled" && index <= currentIndex;
          const active = status !== "cancelled" && index === currentIndex;
          return (
            <div
              key={stage.key}
              className={`relative border p-3 ${
                done ? "border-brand-navy bg-white" : "border-[#eadbd2] bg-background"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                    done ? "bg-brand-navy text-white" : "bg-[#eadbd2] text-brand-navy"
                  }`}
                >
                  {index + 1}
                </span>
                <strong className="text-sm">{stage.label}</strong>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {done
                  ? index === 0
                    ? placedDate.toLocaleDateString("en-IN")
                    : active
                      ? "Current status"
                      : "Completed"
                  : "Pending"}
              </p>
              <p className="mt-1 text-xs">{stage.helper}</p>
            </div>
          );
        })}
      </div>
      {status === "preview" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          This preview order is placed. Packing, shipping and delivery will update here once fulfilment is connected.
        </p>
      ) : status === "cancelled" ? (
        <p className="mt-3 text-xs text-red-700">
          This order was cancelled{cancellationReason ? `: ${cancellationReason}` : "."}
        </p>
      ) : null}
    </section>
  );
}

function orderStatusLabel(status: CustomerOrder["status"]) {
  switch (status) {
    case "preview":
      return "Order placed";
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

function orderStatusDate(status: CustomerOrder["status"], createdAt: string, cancelledAt?: string) {
  const sourceDate = status === "cancelled" && cancelledAt ? cancelledAt : createdAt;
  const date = new Date(sourceDate);
  const prefix =
    status === "delivered"
      ? "Delivered on"
      : status === "cancelled"
        ? "Cancelled on"
        : status === "shipped"
          ? "Shipped on"
          : status === "packed"
            ? "Packed on"
            : "Placed on";

  return `${prefix} ${date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })}, ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
}

const cancellationReasons = [
  "Ordered by mistake",
  "Need to change address",
  "Need to change product",
  "Found a better option",
  "Delivery is taking too long",
  "Other reason",
];

function canCancelOrder(status: CustomerOrder["status"]) {
  return status === "preview" || status === "packed" || status === "shipped";
}

function OrderReviewControl({ order }: { order: CustomerOrder }) {
  const uniqueItems = order.items.filter(
    (item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug) === index,
  );

  return (
    <section className="mt-4 border border-[#eadbd2] bg-[#fffaf6] p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">Rate & Review</p>
      <h3 className="mt-1 font-semibold text-brand-navy">How was your product experience?</h3>
      <div className="mt-4 grid gap-4">
        {uniqueItems.map((item) => (
          <ProductReviewForm
            key={item.slug}
            orderId={order.id}
            item={item}
            existingReview={order.reviews?.find((review) => review.slug === item.slug)}
          />
        ))}
      </div>
    </section>
  );
}

function ProductReviewForm({
  orderId,
  item,
  existingReview,
}: {
  orderId: string;
  item: CustomerOrder["items"][number];
  existingReview?: NonNullable<CustomerOrder["reviews"]>[number];
}) {
  const auth = useAuth();
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(Boolean(existingReview));

  const applyReview = (review: OrderReview) => {
    setRating(review.rating);
    setReviewText(review.reviewText);
    setSaved(true);
  };

  useEffect(() => {
    setRating(existingReview?.rating ?? 5);
    setReviewText(existingReview?.reviewText ?? "");
    setSaved(Boolean(existingReview));
  }, [existingReview?.rating, existingReview?.reviewText]);

  async function submitReview() {
    setBusy(true);
    setError("");
    try {
      const next = await auth.mutate("order-review", {
        id: orderId,
        slug: item.slug,
        rating,
        reviewText,
      });
      const updatedReview = next.orders
        .find((order) => order.id === orderId)
        ?.reviews?.find((review) => review.slug === item.slug);
      if (updatedReview) applyReview(updatedReview);
      else setSaved(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-[#eadbd2] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.size} · {item.flow} · {item.pack}
          </p>
        </div>
        {saved ? <span className="order-status">Reviewed</span> : null}
      </div>
      <div className="rating-stars mt-4 flex flex-wrap items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`rating-star ${value <= rating ? "rating-star--selected" : ""}`}
            aria-label={`${value} star rating`}
            onClick={() => {
              setRating(value);
              setSaved(false);
            }}
          >
            ?
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-brand-navy">{rating}/5</span>
      </div>
      <label className="field mt-4">
        Review
        <textarea
          rows={3}
          minLength={8}
          maxLength={1000}
          value={reviewText}
          onChange={(event) => {
            setReviewText(event.target.value);
            setSaved(false);
          }}
          placeholder="Share fit, comfort, absorbency, packaging..."
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button disabled={busy || reviewText.trim().length < 8} onClick={submitReview}>
          {busy ? "Saving..." : saved ? "Update review" : "Submit review"}
        </Button>
        {saved ? <p className="text-sm text-emerald-700">Review saved.</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

function CancelOrderControl({ orderId }: { orderId: string }) {
  const auth = useAuth();
  const [reason, setReason] = useState(cancellationReasons[0] ?? "Other reason");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancelOrder() {
    setBusy(true);
    setError("");
    try {
      await auth.mutate("order-cancel", { id: orderId, reason });
      setConfirmOpen(false);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-4 grid gap-3 border border-[#eadbd2] bg-[#fffaf6] p-4 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-end">
        <label className="field m-0">
          Cancellation reason
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            {cancellationReasons.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          className="bg-white text-red-700"
          disabled={busy}
          onClick={() => {
            setError("");
            setConfirmOpen(true);
          }}
        >
          Cancel order
        </Button>
        {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              This will stop the order and save the selected cancellation reason.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-[#eadbd2] bg-[#fffaf6] p-4 text-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Reason</p>
            <p className="mt-1 font-semibold text-brand-navy">{reason}</p>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" className="bg-white" disabled={busy} onClick={() => setConfirmOpen(false)}>
              Keep order
            </Button>
            <Button className="bg-red-700 text-white hover:bg-red-800" disabled={busy} onClick={cancelOrder}>
              {busy ? "Cancelling..." : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountWishlistGrid({ wishlist }: { wishlist: string[] }) {
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog/products")
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { products?: Product[] };
        const liveProducts = Array.isArray(payload.products) ? payload.products : [];
        if (!cancelled && liveProducts.length > 0) setCatalogProducts(liveProducts);
      })
      .catch(() => {
        if (!cancelled) setCatalogProducts(products);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savedProducts = catalogProducts.filter((product) => wishlist.includes(product.slug));
  return savedProducts.length ? (
    <ProductGrid items={savedProducts} />
  ) : (
    <EmptyState
      title="Saved products are syncing"
      copy="Your wishlist is saved. Refresh the catalog if a newly added product is not visible yet."
    />
  );
}

function AddressManager() {
  const auth = useAuth();
  const [editing, setEditing] = useState<Address | null | undefined>(undefined),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await auth.mutate("address-save", {
        ...(editing ? { id: editing.id } : {}),
        ...Object.fromEntries(
          ["name", "phone", "line1", "line2", "city", "state", "pin", "label"].map((k) => [
            k,
            String(f.get(k) || ""),
          ]),
        ),
        isDefault: f.get("isDefault") === "on",
      });
      setEditing(undefined);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="mb-6 w-full justify-start"
        onClick={() => {
          setError("");
          setEditing(null);
        }}
      >
        <Plus />
        Add a new address
      </Button>
      {!auth.addresses.length && (
        <p className="py-8 text-center text-muted-foreground">
          No saved addresses yet. Add your first one above.
        </p>
      )}
      <div className="grid gap-4">
        {auth.addresses.map((a) => (
          <article key={a.id} className="border p-5">
            <div className="mb-4 flex justify-between">
              <span className="order-status">
                {a.label}
                {a.isDefault ? " · Default" : ""}
              </span>
              <div className="flex gap-4 text-xs">
                <button
                  className="underline"
                  onClick={() => {
                    setError("");
                    setEditing(a);
                  }}
                >
                  Edit
                </button>
                <button className="underline" onClick={() => setDeleting(a.id)}>
                  Delete
                </button>
              </div>
            </div>
            <p className="font-semibold">
              {a.name} <span className="ml-4 text-sm font-normal">{a.phone}</span>
            </p>
            <p className="mt-3 text-sm leading-6">
              {a.line1}
              {a.line2 ? ", " + a.line2 : ""}
              <br />
              {a.city}, {a.state} — {a.pin}
            </p>
            {!a.isDefault && (
              <Button
                variant="link"
                disabled={busy}
                className="mt-3 p-0"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await auth.mutate("address-save", { ...a, isDefault: true });
                  } catch (e) {
                    setError(message(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Make default
              </Button>
            )}
          </article>
        ))}
      </div>
      {error && editing === undefined && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(v) => {
          if (!v && !busy) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit address" : "Add a new address"}</DialogTitle>
            <DialogDescription>Save your delivery details to your account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" key={editing?.id || "new"}>
            {[
              { key: "name", label: "Full name", auto: "name" },
              { key: "phone", label: "Mobile number", auto: "tel" },
              { key: "line1", label: "House, building & street", auto: "address-line1" },
              { key: "line2", label: "Landmark / apartment (optional)", auto: "address-line2" },
              { key: "city", label: "City", auto: "address-level2" },
              { key: "state", label: "State", auto: "address-level1" },
              { key: "pin", label: "PIN code", auto: "postal-code" },
            ].map((f) => (
              <label className="field" key={f.key}>
                {f.label}
                <input
                  name={f.key}
                  defaultValue={editing?.[f.key as keyof Address]?.toString() || ""}
                  required={f.key !== "line2"}
                  autoComplete={f.auto}
                  pattern={
                    f.key === "phone"
                      ? "[6-9][0-9]{9}"
                      : f.key === "pin"
                        ? "[1-9][0-9]{5}"
                        : undefined
                  }
                  minLength={f.key === "line1" ? 5 : undefined}
                />
              </label>
            ))}
            <label className="field">
              Address type
              <select name="label" defaultValue={editing?.label || "Home"}>
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>
            </label>
            <label className="flex gap-2 text-sm sm:col-span-2">
              <input
                name="isDefault"
                type="checkbox"
                defaultChecked={editing?.isDefault || !auth.addresses.length}
              />
              Make this my default address
            </label>
            {error && (
              <p role="alert" className="form-error sm:col-span-2">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save address"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this address?</DialogTitle>
            <DialogDescription>
              Your existing orders will keep their delivery details.
            </DialogDescription>
          </DialogHeader>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await auth.mutate("address-delete", { id: deleting });
                setDeleting(null);
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete address
          </Button>
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Keep address
          </Button>
          {error && <p role="alert">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
