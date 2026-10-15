import { createFileRoute, notFound } from "@/router-shim";
import { ProductDetail } from "@/features/catalog-pages";
import type { Product } from "@/lib/catalog";
import { seo, siteUrl } from "@/lib/seo";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    let payload: { products?: Product[] };
    try {
      const response = await fetch(`/api/catalog/products?slug=${encodeURIComponent(params.slug!)}&t=${Date.now()}`, {
        cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Product service unavailable");
      payload = await response.json();
      if (!Array.isArray(payload.products)) throw new Error("Invalid product response");
    } catch {
      throw new Error("Product details could not be loaded. Please try again.");
    }
    const p = payload.products!.find((product) => product.slug === params.slug);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData: p }) => (p ? seo(p.name, p.shortDescription, "/products/" + p.slug) : {}),
  component: function DetailRoute() {
    const p = Route.useLoaderData();
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: p.name,
              description: p.description,
              sku: p.sku,
              brand: { "@type": "Brand", name: "SheRise" },
              image: p.images.map((i: string) => new URL(i, siteUrl).href),
            }),
          }}
        />
        <ProductDetail key={p.slug} product={p} />
      </>
    );
  },
});
