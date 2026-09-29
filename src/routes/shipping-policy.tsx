import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/shipping-policy")({
  head: () =>
    seo(
      "shipping policy",
      "shipping policy â€” explore thoughtful care and the SheRise shopping experience.",
      "/shipping-policy",
      false,
    ),
  component: () => <InfoPage kind="shipping-policy" />,
});
