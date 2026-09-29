import { useEffect, useState } from "react";
import { Link, useRouterState } from "@/router-shim";
import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
  Minus,
  Plus,
  ChevronDown,
  Instagram,
  Facebook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Brand } from "@/components/brand";
import { products, money, type Product } from "@/lib/catalog";
import { useStore, cartKey, readLocal, saveLocal } from "@/lib/store";
import popupImage from "@/assets/sherise-flatlay.jpg";

import { siteConfig } from "@/lib/site-config";
const nav = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Why SheRise", to: "/why-sherise" },
  { label: "Period Care", to: "/period-guide" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
] as const;
export function AnnouncementBar() {
  const [i, setI] = useState(0);
  const messages = [
    "Comfort made for every cycle | Shop SheRise",
    "Release. Renew & Rise.",
    "Thoughtful period care for everyday movement",
  ];
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % messages.length), 4500);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="flex h-8 items-center justify-center bg-brand-coral px-4 text-center text-[11px] font-bold uppercase text-brand-coral-foreground"
      aria-live="polite"
    >
      {messages[i]}
    </div>
  );
}
export function Header() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { cart, wishlist, setCartOpen, setSearchOpen } = useStore();
  const [menu, setMenu] = useState(false);
  const count = cart.reduce((a, b) => a + b.quantity, 0);
  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="container-shell grid h-[74px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Brand />
          <nav
            aria-label="Primary"
            className="hidden min-w-0 items-center justify-center gap-3 xl:flex"
          >
            {nav.map((n) => (
              n.to === "/shop" ? (
                <div key={n.to} className="group relative py-7">
                  <button
                    type="button"
                    className={`flex cursor-pointer items-center text-sm font-semibold transition-colors hover:text-brand-coral ${
                      path === "/shop" || path.startsWith("/category/")
                        ? "text-brand-coral"
                        : ""
                    }`}
                  >
                    Shop <ChevronDown className="ml-1 size-3 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
                  </button>
                  <div className="absolute left-0 top-[70px] hidden w-56 gap-1 border bg-background p-4 shadow-lg group-hover:grid group-focus-within:grid">
                    <Link className="p-3 hover:bg-brand-blush" to="/shop">
                      All essentials
                    </Link>
                    <Link
                      className="p-3 hover:bg-brand-blush"
                      to="/category/$category"
                      params={{ category: "sanitary-pads" }}
                    >
                      Sanitary Pads
                    </Link>
                  </div>
                </div>
              ) : n.to === "/period-guide" ? (
                <div key={n.to} className="group relative py-7">
                  <button
                    type="button"
                    className={`flex cursor-pointer items-center text-sm font-semibold transition-colors hover:text-brand-coral ${
                      path === "/period-guide" || path === "/faq" ? "text-brand-coral" : ""
                    }`}
                  >
                    Period Care <ChevronDown className="ml-1 size-3 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
                  </button>
                  <div className="absolute left-0 top-[70px] hidden w-56 gap-1 border bg-background p-4 shadow-lg group-hover:grid group-focus-within:grid">
                    <Link className="p-3 hover:bg-brand-blush" to="/period-guide">
                      Period Guide
                    </Link>
                    <Link className="p-3 hover:bg-brand-blush" to="/faq">
                      FAQs
                    </Link>
                  </div>
                </div>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`relative py-7 text-sm font-semibold transition-colors hover:text-brand-coral ${path === n.to ? "text-brand-coral after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-coral" : ""}`}
                >
                  {n.label}
                </Link>
              )
            ))}
          </nav>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search />
            </Button>
            <Button asChild variant="ghost" size="icon" className="inline-flex">
              <Link to="/account" aria-label="Account">
                <UserRound />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Link
                to="/wishlist"
                aria-label={`Wishlist, ${wishlist.length} items`}
                className="relative"
              >
                <Heart />
                <Count n={wishlist.length} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Cart, ${count} items`}
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag />
              <Count n={count} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              aria-label="Open menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent
          side="right"
          className="w-full max-w-none overflow-auto bg-brand-cream p-6 sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>
              <Brand />
            </SheetTitle>
            <SheetDescription>Explore SheRise</SheetDescription>
          </SheetHeader>
          <nav className="mt-8 grid">
            {nav.map((n) => (
              n.to === "/shop" ? (
                <details key={n.to} className="border-b py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-display text-2xl">
                    Shop <ChevronDown className="size-5" />
                  </summary>
                  <div className="mt-4 grid gap-3 pl-4 text-base">
                    <Link to="/shop" onClick={() => setMenu(false)}>
                      All essentials
                    </Link>
                    <Link
                      to="/category/$category"
                      params={{ category: "sanitary-pads" }}
                      onClick={() => setMenu(false)}
                    >
                      Sanitary Pads
                    </Link>
                  </div>
                </details>
              ) : n.to === "/period-guide" ? (
                <details key={n.to} className="border-b py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-display text-2xl">
                    Period Care <ChevronDown className="size-5" />
                  </summary>
                  <div className="mt-4 grid gap-3 pl-4 text-base">
                    <Link to="/period-guide" onClick={() => setMenu(false)}>
                      Period Guide
                    </Link>
                    <Link to="/faq" onClick={() => setMenu(false)}>
                      FAQs
                    </Link>
                  </div>
                </details>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMenu(false)}
                  className="border-b py-4 font-display text-2xl"
                >
                  {n.label}
                </Link>
              )
            ))}
          </nav>
          <div className="mt-8 flex gap-3">
            <Button asChild variant="outline">
              <Link to="/account" onClick={() => setMenu(false)}>
                My account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/wishlist" onClick={() => setMenu(false)}>
                Wishlist
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
function Count({ n }: { n: number }) {
  return n ? (
    <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-brand-coral text-[9px] text-brand-coral-foreground">
      {n}
    </span>
  ) : null;
}
export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, update, remove } = useStore();
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  useEffect(() => {
    if (!cartOpen) return;
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
  }, [cartOpen]);
  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="flex w-full flex-col p-6 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your bag</SheetTitle>
          <SheetDescription>
            {cart.length
              ? `${cart.length} product selection${cart.length > 1 ? "s" : ""}`
              : "Ready when you are."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex-1 space-y-5 overflow-auto">
          {cart.length === 0 ? (
            <div className="grid h-60 place-items-center text-center">
              <div>
                <ShoppingBag className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p>Your bag is empty.</p>
                <Button asChild variant="link" onClick={() => setCartOpen(false)}>
                  <Link to="/shop">Explore the shop</Link>
                </Button>
              </div>
            </div>
          ) : (
            cart.map((item) => {
              const p = liveProducts.find((x) => x.slug === item.slug) || products.find((x) => x.slug === item.slug);
              const productName = item.name || p?.name || titleFromSlug(item.slug);
              const productImage = item.image || p?.images[0] || popupImage;
              return (
                <div
                  key={cartKey(item)}
                  className="grid grid-cols-[72px_1fr_auto] gap-3 border-b pb-5"
                >
                  <img
                    src={productImage}
                    alt=""
                    className="size-[72px] border bg-brand-cream object-cover"
                    onError={(event) => {
                      event.currentTarget.src = popupImage;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.size} · {item.pack}
                    </p>
                    <div className="mt-3 inline-flex items-center border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        aria-label="Decrease quantity"
                        onClick={() => update(cartKey(item), item.quantity - 1)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-7 text-center text-xs">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        aria-label="Increase quantity"
                        onClick={() => update(cartKey(item), item.quantity + 1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(item.price * item.quantity)}</p>
                    <button
                      className="mt-3 text-xs underline"
                      onClick={() => remove(cartKey(item))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {cart.length > 0 && (
          <div className="safe-bottom border-t pt-5">
            <div className="mb-4 flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>{money(total)}</span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Shipping is calculated at checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline">
                <Link to="/cart" onClick={() => setCartOpen(false)}>
                  View cart
                </Link>
              </Button>
              <Button asChild variant="coral">
                <Link to="/checkout" onClick={() => setCartOpen(false)}>
                  Checkout
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const saved = readLocal<unknown>("sherise-searches", []);
    setRecent(
      Array.isArray(saved)
        ? saved.filter((x): x is string => typeof x === "string").slice(0, 5)
        : [],
    );
  }, []);
  const finishSearch = () => {
    if (q.trim()) {
      const next = [q.trim(), ...recent.filter((x) => x !== q.trim())].slice(0, 5);
      setRecent(next);
      saveLocal("sherise-searches", next);
    }
    setSearchOpen(false);
  };
  const matches = q
    ? products
        .filter((p) =>
          (p.name + " " + p.category + " " + p.flow.join(" "))
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .slice(0, 4)
    : products.slice(0, 3);
  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="top-0 max-h-screen w-full max-w-none translate-y-0 overflow-auto border-0 p-6 sm:top-6 sm:max-w-3xl sm:translate-y-0">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">What are you looking for?</DialogTitle>
          <DialogDescription>Search products, sizes and flow options.</DialogDescription>
        </DialogHeader>
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            aria-label="Search products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “overnight” or “XXL”"
            className="h-14 pl-12 text-base"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[...new Set(["Overnight", "XXL", "Combo", ...recent])].map((term) => (
            <button
              key={term}
              className="rounded-full bg-brand-blush px-4 py-2 text-xs"
              onClick={() => setQ(term)}
            >
              {term}
            </button>
          ))}
        </div>
        <div className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">
            {q ? `${matches.length} suggestions` : "Popular right now"}
          </p>
          {matches.map((p) => (
            <Link
              key={p.slug}
              to="/products/$slug"
              params={{ slug: p.slug }}
              onClick={finishSearch}
              className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b py-3"
            >
              <img src={p.images[0]} alt="" className="size-14 object-cover" />
              <span className="min-w-0 truncate font-medium">{p.name}</span>
              <span className="text-sm">{money(p.salePrice)}</span>
            </Link>
          ))}
          <Button asChild variant="link" className="mt-4">
            <Link to="/search" search={{ q }} onClick={finishSearch}>
              See all search results
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WelcomePopup() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const seenKey = "sherise-welcome-popup-seen";

  const closePopup = () => {
    window.sessionStorage.setItem(seenKey, "true");
    setOpen(false);
  };

  useEffect(() => {
    if (path !== "/" || window.sessionStorage.getItem(seenKey) === "true") {
      setOpen(false);
      return;
    }

    const id = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(id);
  }, [path]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }
        closePopup();
      }}
    >
      <DialogContent className="max-h-[84vh] overflow-hidden border-0 bg-white p-0 sm:max-w-5xl">
        <div className="grid max-h-[84vh] overflow-auto lg:grid-cols-[0.95fr_1fr]">
          <div className="relative min-h-[220px] overflow-hidden bg-brand-cream lg:min-h-[500px]">
            <img
              src={popupImage}
              alt="SheRise period care essentials"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-brand-navy/10" />
            <div className="relative flex h-full flex-col justify-between p-7 text-brand-navy">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em]">SheRise Care</p>
                <h2 className="mt-2 font-display text-4xl leading-none xl:text-5xl">
                  A little care.
                  <br />
                  A whole lot of you.
                </h2>
              </div>
              <div className="w-fit bg-brand-coral px-5 py-2.5 text-base font-bold uppercase text-white shadow">
                Find your flow
              </div>
            </div>
          </div>

          <form
            className="grid content-center gap-3 p-6 sm:p-8"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const lead = {
                name: String(formData.get("name") ?? ""),
                mobile: String(formData.get("mobile") ?? ""),
                email: String(formData.get("email") ?? ""),
                interestedIn: String(formData.get("interestedIn") ?? ""),
                message: String(formData.get("message") ?? ""),
                source: "Website popup",
                createdAt: new Date().toISOString(),
              };
              const old = readLocal<typeof lead[]>("sherise-popup-leads", []);
              saveLocal("sherise-popup-leads", [lead, ...old].slice(0, 50));
              try {
                await fetch("/api/popup-leads", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(lead),
                });
              } catch {
                // Local fallback above keeps the lead available during preview/network hiccups.
              }
              window.dispatchEvent(new Event("sherise-popup-leads-updated"));
              closePopup();
            }}
          >
            <DialogHeader className="text-left">
              <DialogTitle className="font-display text-3xl leading-tight text-brand-navy">
                Tell us what you need
              </DialogTitle>
              <DialogDescription className="text-sm leading-6">
                Fill the form below and we will help you choose comfortable period-care essentials.
              </DialogDescription>
            </DialogHeader>
            <Input name="name" required placeholder="Full Name*" className="h-11" />
            <Input name="email" type="email" placeholder="Email Address" className="h-11" />
            <Input name="mobile" required inputMode="tel" placeholder="Phone Number*" className="h-11" />
            <select
              name="interestedIn"
              className="h-11 border border-input bg-background px-3 text-sm outline-none focus:border-brand-coral"
            >
              <option>Sanitary Pads</option>
              <option>Period Care Combos</option>
              <option>7 Count Pack</option>
              <option>9 Count Pack</option>
              <option>20 Count Pack</option>
              <option>Wholesale / Bulk Enquiry</option>
            </select>
            <textarea
              name="message"
              className="min-h-24 border border-input bg-background px-3 py-3 text-sm outline-none focus:border-brand-coral"
              placeholder="Your message / requirements"
            />
            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" variant="coral" className="px-8">
                Send Enquiry
              </Button>
              <Button type="button" variant="outline" onClick={closePopup}>
                Maybe later
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-[#211877] text-white">
      <div className="container-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Brand />
          <p className="mt-5 max-w-sm text-sm leading-7 opacity-80">
            Thoughtful period care for comfort, confidence and everyday movement.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {siteConfig.instagramUrl ? (
              <a
                href={siteConfig.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-10 items-center justify-center border border-white/30 text-white transition hover:border-brand-coral hover:bg-brand-coral"
                aria-label="SheRise on Instagram"
              >
                <Instagram className="size-5" />
              </a>
            ) : (
              <Link
                to="/contact"
                className="inline-flex size-10 items-center justify-center border border-white/30 text-white transition hover:border-brand-coral hover:bg-brand-coral"
                aria-label="SheRise on Instagram"
              >
                <Instagram className="size-5" />
              </Link>
            )}
            {siteConfig.facebookUrl && (
              <a
                href={siteConfig.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-10 items-center justify-center border border-white/30 text-white transition hover:border-brand-coral hover:bg-brand-coral"
                aria-label="SheRise on Facebook"
              >
                <Facebook className="size-5" />
              </a>
            )}
          </div>
        </div>
        <FooterCol
          title="Shop"
          links={[
            ["Shop All", "/shop"],
            ["Sanitary Pads", "/category/sanitary-pads"],
            ["Combos", "/search?q=combo"],
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            ["About Us", "/about"],
            ["Why SheRise", "/why-sherise"],
            ["Period Guide", "/period-guide"],
            ["Blog", "/blog"],
            ["FAQs", "/faq"],
          ]}
        />
        <FooterCol
          title="Support"
          links={[
            ["Contact", "/contact"],
            ["Shipping", "/shipping-policy"],
            ["Returns", "/return-refund-policy"],
            ["Privacy", "/privacy-policy"],
            ["Terms", "/terms"],
          ]}
        />
      </div>
      <div className="container-shell border-t border-white/20 py-5 text-center text-xs opacity-70">
        <span className="block">
          Copyright 2026 All Rights Reserved By SheRise Designed By{" "}
          <a
            href="https://webakoof.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline-offset-4 hover:underline"
          >
            Webakoof
          </a>
        </span>
      </div>
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="mb-4 font-sans text-xs font-bold uppercase">{title}</h2>
      <ul className="space-y-3 text-sm opacity-80">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="hover:opacity-70">
              {label}
            </Link>
          </li>
        ))}
      </ul>
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
