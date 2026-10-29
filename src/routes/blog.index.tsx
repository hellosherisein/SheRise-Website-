import { createFileRoute } from "@/router-shim";

import { BlogListing } from "@/features/content-pages";
import type { BlogPost } from "@/lib/catalog";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  loader: async () => {
    const response = await fetch("/api/content/blogs");
    if (!response.ok) throw new Error("Could not load blog posts. Please try again.");
    const payload = (await response.json()) as { posts: BlogPost[] };
    return payload.posts;
  },
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
