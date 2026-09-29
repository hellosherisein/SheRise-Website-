import { createFileRoute, notFound } from "@/router-shim";

import { BlogDetail } from "@/features/content-pages";
import { getPost, posts, type BlogPost } from "@/lib/catalog";
import { seo, siteUrl } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const live = await fetch(`/api/content/blogs/${encodeURIComponent(params.slug)}`)
      .then((response) => (response.ok ? response.json() : undefined))
      .catch(() => undefined) as { post?: BlogPost; related?: BlogPost[] } | undefined;
    const post = live?.post || getPost(params.slug);
    if (!post) throw notFound();
    return { post, related: live?.related?.length ? live.related : posts };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    return p ? seo(p.title, p.excerpt, "/blog/" + p.slug) : {};
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
              datePublished: Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString(),
              author: { "@type": "Organization", name: "SheRise" },
              image: new URL(p.image, siteUrl).href,
            }),
          }}
        />
        <BlogDetail post={p} relatedPosts={related} />
      </>
    );
  },
});
