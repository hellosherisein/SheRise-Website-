import { createFileRoute } from "@/router-shim";
import { Checkout } from "@/features/checkout-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/checkout")({
  head: () =>
    seo(
      "Checkout",
      "Checkout â€” explore thoughtful care and the SheRise shopping experience.",
      "/checkout",
      true,
    ),
  component: () => <Checkout />,
});
