import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/return-refund-policy")({
  head: () =>
    seo(
      "Return & refund policy",
      "Return, replacement, cancellation and refund rules for SheRise hygiene products.",
      "/return-refund-policy",
      false,
    ),
  component: () => <InfoPage kind="return-refund-policy" />,
});
