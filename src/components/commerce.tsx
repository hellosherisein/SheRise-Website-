import { Link, useRouterState } from "@/router-shim";
import { useState, type ReactNode } from "react";
import { ArrowRight, Minus, Plus, Flower2, Heart, Package, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { ProductCard } from "./product-card";
import { siteUrl } from "@/lib/seo";
import { products, posts, type BlogPost, type Product } from "@/lib/catalog";
export function Action({
  to,
  children,
  outline = false,
}: {
  to: string;
  children: ReactNode;
  outline?: boolean;
}) {
  return (
    <Button asChild size="lg" variant={outline ? "outline" : "navy"}>
      <Link to={to}>
        {children}
        <ArrowRight size={16} />
      </Link>
    </Button>
  );
}
export function Breadcrumb({ title }: { title: string }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-7 flex flex-wrap gap-2 text-xs text-muted-foreground"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteUrl + "/" },
              { "@type": "ListItem", position: 2, name: title, item: siteUrl + path },
            ],
          }),
        }}
      />
      <Link to="/">Home</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}
export function PageHeading({
  title,
  copy,
  showBreadcrumb = true,
  align = "left",
}: {
  title: string;
  copy?: string;
  showBreadcrumb?: boolean;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div className={`mb-10 ${centered ? "mx-auto max-w-4xl text-center" : ""}`}>
      {showBreadcrumb && <Breadcrumb title={title} />}
      <h1 className="text-4xl md:text-6xl text-brand-navy">{title}</h1>
      {copy && (
        <p className={`mt-4 max-w-2xl leading-7 text-muted-foreground ${centered ? "mx-auto" : ""}`}>
          {copy}
        </p>
      )}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="mb-9">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-3xl md:text-5xl text-brand-navy">{title}</h2>
      {copy && <p className="mt-3 text-muted-foreground">{copy}</p>}
    </div>
  );
}
export function ProductGrid({ items = products }: { items?: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
export function QuantitySelector({
  value,
  onChange,
  max = 99,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  const currentValue = disabled ? 0 : value;
  return (
    <div className="inline-flex items-center border bg-background">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Decrease quantity"
        disabled={disabled || currentValue <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <output className="w-9 text-center" aria-label="Quantity">
        {currentValue}
      </output>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Increase quantity"
        disabled={disabled || currentValue >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
export function EmptyState({
  title,
  copy = "Explore a little. Find something that feels like you.",
}: {
  title: string;
  copy?: string;
}) {
  return (
    <div className="border bg-brand-cream px-5 py-16 text-center">
      <Flower2 className="mx-auto mb-5 size-10 text-brand-coral" />
      <h2 className="text-3xl">{title}</h2>
      <p className="my-5 text-muted-foreground">{copy}</p>
      <Action to="/shop">Explore the shop</Action>
    </div>
  );
}
export function Benefits() {
  return (
    <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
      {[
        {
          Icon: Heart,
          title: "Comfort comes first",
          copy: "Care that fits into your everyday routine.",
        },
        {
          Icon: Flower2,
          title: "Thoughtful choices",
          copy: "Space to find what works for your flow.",
        },
        { Icon: Sparkles, title: "Move your own way", copy: "Your day, your pace, your period." },
        {
          Icon: Package,
          title: "Little details matter",
          copy: "Clear information, simple shopping.",
        },
      ].map(({ Icon, title, copy }) => (
        <div key={title}>
          <Icon className="mb-4 size-7 text-brand-burgundy" />
          <h3 className="mb-2 text-xl">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
        </div>
      ))}
    </div>
  );
}
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y border-y">
      {items.map((item) => (
        <details key={item.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {item.q}
            <Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" />
          </summary>
          <p className="pt-4 text-sm leading-7 text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
export function BlogGrid({ items = posts }: { items?: BlogPost[] }) {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {items.map((p) => (
        <article key={p.slug}>
          <Link to="/blog/$slug" params={{ slug: p.slug }}>
            <img
              src={p.image}
              alt={p.title}
              width="640"
              height="480"
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
            <p className="eyebrow mt-5">
              {p.category} · {p.date}
            </p>
            <h3 className="text-2xl">{p.title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{p.excerpt}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              Read the story <ArrowRight size={15} />
            </span>
          </Link>
        </article>
      ))}
    </div>
  );
}
export function Newsletter() {
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="bg-brand-blush py-14">
      <div className="container-shell grid items-center gap-8 md:grid-cols-2">
        <div>
          <p className="eyebrow">A LITTLE CARE IN YOUR INBOX</p>
          <h2 className="text-4xl text-brand-navy">Stay in the SheRise Circle.</h2>
          <p className="mt-3 text-sm">
            Thoughtful reads, everyday rituals and a little encouragement.
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            setSaving(true);
            setDone(false);
            setError("");
            try {
              const response = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  email: formData.get("email"),
                  source: "Homepage newsletter",
                }),
              });
              const payload = (await response.json()) as { error?: string };
              if (!response.ok) throw new Error(payload.error || "Could not save signup.");
              setDone(true);
              form.reset();
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : "Could not save signup.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label htmlFor="newsletter" className="sr-only">
            Email address
          </label>
          <div className="flex border-b border-brand-navy">
              <input
                id="newsletter"
                name="email"
                required
                type="email"
                placeholder="Your email address"
                className="min-w-0 flex-1 bg-transparent py-4 outline-none"
              />
            <button className="px-4 font-semibold disabled:opacity-60" type="submit" disabled={saving}>
              {saving ? "SAVING..." : "JOIN US ?"}
            </button>
          </div>
          <p role={error ? "alert" : "status"} className="mt-3 text-xs">
            {error
              ? error
              : done
                ? "Thanks! You are now part of the SheRise Circle."
                : "Join the SheRise newsletter for care notes and updates."}
          </p>
        </form>
      </div>
    </section>
  );
}
