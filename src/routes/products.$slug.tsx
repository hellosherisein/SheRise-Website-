import { createFileRoute, notFound } from "@/router-shim";
import { ProductDetail } from "@/features/catalog-pages";
import { getProduct, type Product } from "@/lib/catalog";
import { seo, siteUrl } from "@/lib/seo";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const liveProducts = await fetch("/api/catalog/products")
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { products?: Product[] } | undefined) => payload?.products || [])
      .catch(() => []);
    const p = liveProducts.find((product) => product.slug === params.slug) || getProduct(params.slug);
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
