import { createFileRoute } from "@/router-shim";
import { Collection } from "@/features/catalog-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/shop")({
  head: () =>
    seo(
      "Shop SheRise",
      "Shop SheRise â€” explore thoughtful care and the SheRise shopping experience.",
      "/shop",
      false,
    ),
  component: () => <Collection />,
});
