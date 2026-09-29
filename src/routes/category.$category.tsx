import { createFileRoute, notFound } from "@/router-shim";
import { Collection } from "@/features/catalog-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/category/$category")({
  loader: ({ params }) => {
    if (params.category !== "sanitary-pads") throw notFound();
    return "Sanitary Pads";
  },
  head: ({ loaderData, params }) =>
    seo(
      loaderData || "Collection",
      "Explore the SheRise " + loaderData + " preview collection.",
      "/category/" + params.category,
    ),
  component: function CategoryRoute() {
    return <Collection category={Route.useLoaderData()} />;
  },
});
