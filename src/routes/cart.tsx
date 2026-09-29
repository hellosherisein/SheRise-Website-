import { createFileRoute } from "@/router-shim";
import { Cart } from "@/features/checkout-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/cart")({
  head: () =>
    seo(
      "Your bag",
      "Your bag â€” explore thoughtful care and the SheRise shopping experience.",
      "/cart",
      true,
    ),
  component: () => <Cart />,
});
