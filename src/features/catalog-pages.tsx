import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/router-shim";
import { Heart, SlidersHorizontal, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { products, getProduct, money, type Product } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import {
  PageHeading,
  ProductGrid,
  EmptyState,
  Breadcrumb,
  QuantitySelector,
  Accordion,
  SectionHeading,
} from "@/components/commerce";
import { Button } from "@/components/ui/button";
import { ProductReviews } from "@/components/product-reviews";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function Collection({
  category = "",
  searchMode = false,
}: {
  category?: string;
  searchMode?: boolean;
}) {
  const { catalogProducts, catalogError, retryCatalog } = useStore();
  const [q, setQ] = useState(""),
    [flow, setFlow] = useState(""),
    [size, setSize] = useState(""),
    [cat, setCat] = useState(category),
    [price, setPrice] = useState(600),
    [stock, setStock] = useState(false),
    [sort, setSort] = useState("Featured"),
    [open, setOpen] = useState(false),
    [limit, setLimit] = useState(4);
  useEffect(() => {
    const s = new URLSearchParams(location.search);
    setQ(s.get("q") || "");
    const requestedFlow = (s.get("flow") || "").trim().toLowerCase();
    setFlow(["Light", "Medium", "Heavy", "Overnight"].find((value) => value.toLowerCase() === requestedFlow) || "");
    setCat(category);
  }, [category]);
  const items = (catalogProducts ?? [])
    .filter(
      (p) =>
        (!cat || p.category === cat || p.categories?.includes(cat)) &&
        (!flow || p.flow.some((value) => value.trim().toLowerCase() === flow.toLowerCase())) &&
        (!size || p.sizes.includes(size)) &&
        p.salePrice <= price &&
        (!stock || p.stock > 0) &&
        (p.name + " " + p.flow.join(" ") + " " + p.category + " " + (p.categories || []).join(" "))
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Price low to high"
        ? a.salePrice - b.salePrice
        : sort === "Price high to low"
          ? b.salePrice - a.salePrice
          : sort === "Newest"
            ? b.id.localeCompare(a.id)
            : sort === "Best selling"
              ? Number(b.featured) - Number(a.featured)
              : 0,
    );
  const filters = (
    <div className="space-y-7">
      <h2 className="text-2xl">Refine your care</h2>
      {[
        ["Category", cat, setCat, ["Sanitary Pads", "Period Care"]],
        ["Flow", flow, setFlow, ["Light", "Medium", "Heavy", "Overnight"]],
        ["Size", size, setSize, ["XL", "XXL", "XXXL"]],
      ].map(([label, value, set, options]) => (
        <label className="field" key={String(label)}>
          {String(label)}
          <select
            value={String(value)}
            onChange={(e) => (set as (v: string) => void)(e.target.value)}
          >
            <option value="">All</option>
            {(options as string[]).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      ))}
      <label className="field">
        Maximum price: {money(price)}
        <input
          type="range"
          min="80"
          max="600"
          value={price}
          onChange={(e) => setPrice(+e.target.value)}
        />
      </label>
      <label className="flex gap-3 text-sm">
        <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} />
        In stock only
      </label>
      <Button
        variant="outline"
        onClick={() => {
          setCat(category);
          setFlow("");
          setSize("");
          setPrice(600);
          setStock(false);
          setQ("");
        }}
      >
        Clear filters
      </Button>
    </div>
  );
  return (
    <div className="container-shell py-10 md:py-16">
      <PageHeading
        title={searchMode ? "Find your everyday care" : category || "Shop SheRise"}
        copy="Thoughtful essentials, at your own pace. Prices and availability are demo data."
      />
      <div className="mb-8">
        <label className="field">
          Search products
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try XXL, overnight or combo"
            type="search"
          />
        </label>
      </div>
      <div className="grid gap-10 lg:grid-cols-[210px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Button className="lg:hidden" variant="outline" onClick={() => setOpen(true)}>
              <SlidersHorizontal />
              Filters
            </Button>
            <p role="status" className="text-sm">
              {items.length} products
            </p>
            <label className="text-sm">
              Sort by{" "}
              <select
                className="ml-2 border p-2"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {[
                  "Featured",
                  "Best selling",
                  "Price low to high",
                  "Price high to low",
                  "Newest",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              [flow, () => setFlow("")],
              [size, () => setSize("")],
              [q, () => setQ("")],
            ].map(([v, fn]) =>
              v ? (
                <button
                  key={String(v)}
                  className="rounded-full bg-brand-blush px-4 py-2 text-xs"
                  onClick={fn as () => void}
                >
                  {String(v)} ×
                </button>
              ) : null,
            )}
          </div>
          {catalogError ? (
            <div role="alert" className="space-y-3 py-8">
              <p>{catalogError}</p>
              <Button variant="outline" onClick={retryCatalog}>Retry loading products</Button>
            </div>
          ) : catalogProducts === null ? (
            <p role="status" className="py-8">Loading products…</p>
          ) : items.length ? (
            <ProductGrid items={items.slice(0, limit)} layout="shop" />
          ) : (
            <EmptyState
              title="No matches just yet"
              copy="Try a different search or clear a filter."
            />
          )}
          {items.length > limit && (
            <Button className="mt-10" variant="outline" onClick={() => setLimit((x) => x + 4)}>
              Load more
            </Button>
          )}
        </div>
      </div>
      <section className="mt-14 overflow-hidden bg-brand-cream px-5 py-8 shadow-[0_18px_55px_rgba(35,26,112,0.08)] md:px-10 md:py-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-3 bg-white px-4 py-3 text-brand-burgundy shadow-sm">
              <Heart className="size-5 fill-current" />
              <span className="text-xs font-bold uppercase tracking-[0.18em]">
                NGO impact highlight
              </span>
            </div>
            <p className="eyebrow">CARE THAT REACHES FURTHER</p>
            <h2 className="mt-3 max-w-2xl text-3xl leading-tight text-brand-navy md:text-5xl">
              Supporting NGO-led menstrual health conversations.
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
              SheRise partners with community-focused NGO initiatives to make period care
              information feel approachable, practical and shame-free. The goal is simple: more
              awareness, more dignity and more confidence for girls and women who need it most.
            </p>
          </div>
          <div
            className="grid min-w-0 gap-4 py-4 sm:grid-cols-3 lg:gap-5"
            aria-label="NGO impact highlights"
          >
            {[
              ["Awareness", "Open conversations around menstrual hygiene and body literacy."],
              ["Access", "Helping community programs highlight the need for reliable period care."],
              ["Dignity", "Encouraging confident, shame-free choices for every cycle."],
            ].map(([title, copy], index) => (
              <article
                key={title}
                className={`relative min-w-0 border border-brand-navy/10 bg-white p-5 shadow-[0_12px_28px_rgba(35,26,112,0.08)] sm:min-h-64 sm:p-4 xl:p-6 ${
                  index === 1 ? "lg:translate-y-8" : "lg:-translate-y-2"
                }`}
              >
                <span className="mb-8 flex size-14 items-center justify-center rounded-full bg-brand-blush text-brand-burgundy shadow-inner">
                  <Heart className="size-5 fill-current" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-burgundy">
                  0{index + 1}
                </p>
                <h3 className="mt-2 break-words text-2xl text-brand-navy sm:text-xl xl:text-2xl">{title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-auto p-6">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Find the right format for you.</SheetDescription>
          </SheetHeader>
          <div className="mt-6">{filters}</div>
          <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
            Show {items.length} products
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
export function Wishlist() {
  const { wishlist } = useStore();
  const [catalogProducts, setCatalogProducts] = useState(products);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/catalog/products?t=${Date.now()}`, { cache: "no-store" })
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
  const savedProducts = catalogProducts.filter((p) => wishlist.includes(p.slug));
  return (
    <div className="container-shell section-space">
      <PageHeading
        title="Your little wish list"
        copy="Keep the things you love, all in one place."
      />
      {savedProducts.length ? (
        <ProductGrid items={savedProducts} />
      ) : (
        <EmptyState
          title="Save something for yourself"
          copy="Tap the heart on a product to keep it here."
        />
      )}
    </div>
  );
}
export function ProductDetail({ product: p }: { product: Product }) {
  const { add, toggleWish, wishlist, setCartOpen, ready } = useStore();
  const navigate = useNavigate();
  const [size, setSize] = useState(p.sizes[0]!),
    [flow, setFlow] = useState(p.flow[0]!),
    [pack, setPack] = useState(0),
    [qty, setQty] = useState(1),
    [photo, setPhoto] = useState(0),
    [zoom, setZoom] = useState(false),
    [pin, setPin] = useState(""),
    [pinMessage, setPinMessage] = useState(""),
    [recent, setRecent] = useState<string[]>([]);
  const variant = p.packOptions[pack]!;
  let touch = 0;
  useEffect(() => {
    try {
      const old = JSON.parse(localStorage.getItem("sherise-recent") || "[]");
      setRecent(Array.isArray(old) ? old.filter((s) => typeof s === "string" && s !== p.slug) : []);
      localStorage.setItem(
        "sherise-recent",
        JSON.stringify(
          [p.slug, ...(Array.isArray(old) ? old : []).filter((s) => s !== p.slug)].slice(0, 5),
        ),
      );
    } catch {
      /* optional storage */
    }
  }, [p.slug]);
  const purchase = (buy = false) => {
    add({
      slug: p.slug,
      quantity: qty,
      size,
      flow,
      pack: variant.label,
      price: variant.price,
      name: p.name,
      image: p.images[photo] || p.images[0],
    });
    if (buy) {
      setCartOpen(false);
      navigate({ to: "/checkout" });
    }
  };
  return (
    <div className="container-shell py-10">
      <Breadcrumb title={p.name} />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div
            className="relative bg-brand-blush"
            onTouchStart={(e) => {
              touch = e.changedTouches[0]!.clientX;
            }}
            onTouchEnd={(e) => {
              if (Math.abs(touch - e.changedTouches[0]!.clientX) > 40)
                setPhoto(
                  (photo + (touch > e.changedTouches[0]!.clientX ? 1 : p.images.length - 1)) %
                    p.images.length,
                );
            }}
          >
            <img
              src={p.images[photo]}
              alt={`${p.name} — placeholder view ${photo + 1}`}
              width="800"
              height="800"
              className="aspect-square w-full object-cover"
            />
            <Button
              className="absolute right-4 top-4"
              size="icon"
              variant="secondary"
              aria-label="Zoom product image"
              onClick={() => setZoom(true)}
            >
              <ZoomIn />
            </Button>
            <div className="absolute inset-x-4 bottom-4 flex justify-between">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Previous image"
                onClick={() => setPhoto((photo + p.images.length - 1) % p.images.length)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Next image"
                onClick={() => setPhoto((photo + 1) % p.images.length)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            {p.images.map((img, i) => (
              <button
                key={i}
                aria-label={`View image ${i + 1}`}
                aria-pressed={photo === i}
                onClick={() => setPhoto(i)}
                className={`w-20 border-2 ${photo === i ? "border-brand-navy" : "border-transparent"}`}
              >
                <img src={img} width="80" height="80" alt={`Product placeholder ${i + 1}`} />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Replace with actual SheRise product images. Preview specifications.
          </p>
        </div>
        <div>
          <p className="eyebrow">YOUR EVERYDAY CARE</p>
          <h1 className="text-4xl md:text-5xl text-brand-navy">{p.name}</h1>
          <p className="my-5 text-muted-foreground">{p.shortDescription}</p>
          <p className="text-sm">No customer reviews yet</p>
          <div className="my-6">
            <strong className="text-3xl">{money(variant.price)}</strong>{" "}
            <del className="ml-3 text-muted-foreground">{money(variant.mrp)}</del>
            <span className="ml-3 text-brand-burgundy">
              {Math.round((1 - variant.price / variant.mrp) * 100)}% off
            </span>
            <p className="mt-2 text-xs">Demo price</p>
          </div>
          {[
            { label: "Size", values: p.sizes, value: size, set: setSize },
            { label: "Flow", values: p.flow, value: flow, set: setFlow },
          ].map(({ label, values, value, set }) => (
            <fieldset key={label} className="mb-5">
              <legend className="mb-2 text-sm font-semibold">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {values.map((v) => (
                  <Button
                    key={v}
                    variant={v === value ? "navy" : "outline"}
                    aria-pressed={v === value}
                    onClick={() => set(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="field">
            Pack size
            <select
              value={pack}
              onChange={(e) => {
                setPack(+e.target.value);
                setQty(1);
              }}
            >
              {p.packOptions.map((v, i) => (
                <option value={i} key={v.label}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <div className="my-4" />
          <QuantitySelector value={qty} onChange={setQty} max={Math.max(variant.stock, 99)} />
          <div className="purchase-actions mt-5 grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="coral"
              disabled={!ready}
              onClick={() => purchase()}
            >
              ADD TO CART
            </Button>
            <Button size="lg" disabled={!ready} onClick={() => purchase(true)}>
              BUY NOW
            </Button>
          </div>
          <Button
            className="my-4"
            variant="ghost"
            disabled={!ready}
            onClick={() => toggleWish(p.slug)}
          >
            <Heart className={wishlist.includes(p.slug) ? "fill-brand-coral" : ""} />
            {wishlist.includes(p.slug) ? "Saved to wishlist" : "Save for later"}
          </Button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPinMessage(
                "PIN format accepted. Delivery coverage and dates will be confirmed when shipping is connected.",
              );
            }}
          >
            <label className="field">
              Check delivery PIN code
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  inputMode="numeric"
                  pattern="[1-9][0-9]{5}"
                  maxLength={6}
                  required
                  placeholder="6-digit PIN"
                />
                <Button type="submit" variant="outline" size="lg">
                  CHECK
                </Button>
              </div>
            </label>
            <p role="status" className="mt-3 text-xs">
              {pinMessage}
            </p>
          </form>
        </div>
      </div>
      <div className="my-16 grid gap-10 md:grid-cols-[1fr_2fr]">
        <h2 className="text-4xl">
          The thoughtful
          <br />
          little details.
        </h2>
        <Accordion
          items={[
            { q: "Product overview", a: p.description },
            { q: "Key features (preview)", a: p.features.join(". ") },
            {
              q: "Size & flow guide",
              a: "Explore the available size and flow options above. Final lengths and specifications will be supplied by SheRise.",
            },
            { q: "How to use", a: p.usageInstructions.join(" ") },
            { q: "How to dispose", a: p.disposalInstructions.join(" ") },
            { q: "Materials", a: p.materials.join(" ") },
            {
              q: "Shipping & returns",
              a: "Shipping fees, delivery areas and return eligibility are pending final brand confirmation. This preview does not process purchases.",
            },
            ...p.faq,
          ]}
        />
      </div>
      <ProductReviews slug={p.slug} />
      <ProductGrid items={products.filter((x) => p.relatedProducts.includes(x.slug))} />
      {recent.length > 0 && (
        <section className="mt-16">
          <SectionHeading title="Recently viewed" />
          <ProductGrid items={recent.map((s) => getProduct(s)).filter((x): x is Product => !!x)} />
        </section>
      )}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{p.name}</DialogTitle>
            <DialogDescription>Product photography placeholder</DialogDescription>
          </DialogHeader>
          <img
            src={p.images[photo]}
            alt={p.name + " enlarged placeholder"}
            className="max-h-[70vh] w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
