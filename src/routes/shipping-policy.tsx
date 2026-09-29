import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/shipping-policy")({
  head: () =>
    seo(
      "Shipping policy",
      "Shipping timelines, delivery charges, tracking and delivery support information for SheRise orders.",
      "/shipping-policy",
      false,
    ),
  component: () => <InfoPage kind="shipping-policy" />,
});
