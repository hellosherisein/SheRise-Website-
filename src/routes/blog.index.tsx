import { createFileRoute } from "@/router-shim";

import { BlogListing } from "@/features/content-pages";
import { posts, type BlogPost } from "@/lib/catalog";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  loader: async () =>
    await fetch("/api/content/blogs")
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { posts?: BlogPost[] } | undefined) => payload?.posts || posts)
      .catch(() => posts),
  head: () =>
    seo(
      "Let's talk periods",
      "Thoughtful reads about routines, period care and making space for yourself.",
      "/blog",
    ),
  component: function BlogIndexRoute() {
    const items = Route.useLoaderData();
    return <BlogListing items={items} />;
  },
});
