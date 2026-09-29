import { createFileRoute } from "@/router-shim";
import { OrderSuccess } from "@/features/checkout-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/order-success")({
  head: () =>
    seo(
      "Order confirmation",
      "Order confirmation â€” explore thoughtful care and the SheRise shopping experience.",
      "/order-success",
      true,
    ),
  component: () => <OrderSuccess />,
});
