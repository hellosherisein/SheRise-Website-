import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/return-refund-policy")({
  head: () =>
    seo(
      "return refund policy",
      "return refund policy â€” explore thoughtful care and the SheRise shopping experience.",
      "/return-refund-policy",
      false,
    ),
  component: () => <InfoPage kind="return-refund-policy" />,
});
