import { createFileRoute, notFound } from "@/router-shim";

import { BlogDetail } from "@/features/content-pages";
import type { BlogPost } from "@/lib/catalog";
import { seo, siteUrl } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const response = await fetch(`/api/content/blogs/${encodeURIComponent(params["slug"] || "")}`);
    if (!response.ok) throw new Error("Could not load this blog post. Please try again.");
    const live = (await response.json()) as { post?: BlogPost; related?: BlogPost[] };
    const post = live.post;
    if (!post) throw notFound();
    return { post, related: live.related || [] };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    return p ? seo(p.metaTitle || p.title, p.metaDescription || p.excerpt, "/blog/" + p.slug) : {};
  },
  component: function DetailRoute() {
    const { post: p, related } = Route.useLoaderData();
    const parsedDate = new Date(p.date);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: p.title,
              description: p.excerpt,
              datePublished: Number.isNaN(parsedDate.getTime())
                ? undefined
                : parsedDate.toISOString(),
              author: { "@type": "Organization", name: p.author || "SheRise" },
              image: new URL(p.image, siteUrl).href,
            }),
          }}
        />
        <BlogDetail post={p} relatedPosts={related} />
      </>
    );
  },
});
