import { createFileRoute } from "@/router-shim";
import { Wishlist } from "@/features/catalog-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/wishlist")({
  head: () =>
    seo(
      "Wishlist",
      "Wishlist â€” explore thoughtful care and the SheRise shopping experience.",
      "/wishlist",
      true,
    ),
  component: () => <Wishlist />,
});
