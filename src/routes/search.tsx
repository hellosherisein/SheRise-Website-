import { createFileRoute } from "@/router-shim";
import { Collection } from "@/features/catalog-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/search")({
  head: () =>
    seo(
      "Search",
      "Search â€” explore thoughtful care and the SheRise shopping experience.",
      "/search",
      true,
    ),
  component: () => <Collection searchMode />,
});
