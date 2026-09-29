import { useState } from "react";
import { Link } from "@/router-shim";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type Product, money } from "@/lib/catalog";
import { useStore } from "@/lib/store";
export function ProductCard({ product: p }: { product: Product }) {
  const { wishlist, toggleWish, add, ready } = useStore();
  const [quick, setQuick] = useState(false);
  const wished = wishlist.includes(p.slug);
  const addDefault = () =>
    add({
      slug: p.slug,
      quantity: 1,
      size: p.sizes[0]!,
      flow: p.flow[0]!,
      pack: p.packOptions[0]!.label,
      price: p.packOptions[0]!.price,
      name: p.name,
      image: p.images[0],
    });
  return (
    <article className="group relative flex h-full min-w-0 flex-col bg-white">
      <div className="relative aspect-[4/5] overflow-hidden bg-brand-cream">
        <Link
          to="/products/$slug"
          params={{ slug: p.slug }}
          aria-label={`View ${p.name}`}
          className="block h-full"
        >
          <img
            src={p.images[0]}
            alt={`Product photography placeholder for ${p.name}`}
            width={1008}
            height={1008}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
        <span className="absolute left-2 top-3 bg-brand-navy px-2 py-1 text-[9px] font-bold uppercase text-white">
          {p.stock === 0 ? "Coming soon" : p.badge === "Best Seller" ? "Featured" : p.badge}
        </span>
        <Button
          aria-label={wished ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
          aria-pressed={wished}
          disabled={!ready}
          variant="secondary"
          size="icon"
          onClick={() => toggleWish(p.slug)}
          className="absolute right-2 top-2 rounded-full"
        >
          <Heart className={wished ? "fill-brand-coral text-brand-burgundy" : ""} />
        </Button>
        <button
          onClick={() => setQuick(true)}
          className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-2 bg-background/95 py-3 text-xs font-semibold"
        >
          <Eye size={15} />
          Quick view
        </button>
      </div>
      <div className="flex flex-1 flex-col border-2 border-brand-navy border-t-0 p-3">
        <p className="mb-2 text-[10px] text-muted-foreground">Preview product · No reviews yet</p>
        <Link
          to="/products/$slug"
          params={{ slug: p.slug }}
          className="font-display text-lg leading-tight hover:text-brand-burgundy sm:text-xl"
        >
          {p.name}
        </Link>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm">
          {p.shortDescription}
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase text-brand-navy">
          {p.sizes.join(" · ")} | {p.flow.join(" · ")}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            <span className="font-bold">{money(p.salePrice)}</span>{" "}
            <del className="text-xs text-muted-foreground">{money(p.mrp)}</del>
            <p className="text-xs text-brand-burgundy">{p.discount}% off · demo</p>
          </div>
          <Button
            variant="navy"
            size="icon"
            disabled={!ready}
            aria-label={`Add ${p.name} to cart`}
            onClick={addDefault}
          >
            <ShoppingBag />
          </Button>
        </div>
      </div>
      <Dialog open={quick} onOpenChange={setQuick}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{p.name}</DialogTitle>
            <DialogDescription>{p.shortDescription}</DialogDescription>
          </DialogHeader>
          <img
            src={p.images[0]}
            alt="Replace with actual SheRise product image"
            width="400"
            height="400"
            className="mx-auto max-h-[35vh] object-contain"
          />
          <p className="text-xs text-muted-foreground">Replace with actual SheRise product image</p>
          <p className="text-xl font-bold">
            {money(p.salePrice)} <del className="text-sm font-normal">{money(p.mrp)}</del>
          </p>
          <p className="text-sm">
            {p.sizes[0]} · {p.flow[0]} · {p.packOptions[0]?.label}
          </p>
          <Button
            disabled={!ready}
            onClick={() => {
              setQuick(false);
              addDefault();
            }}
          >
            Add to cart
          </Button>
          <Button asChild variant="outline">
            <Link to="/products/$slug" params={{ slug: p.slug }} onClick={() => setQuick(false)}>
              Choose options & view details
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  );
}
