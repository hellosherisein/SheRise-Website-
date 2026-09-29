import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/privacy-policy")({
  head: () =>
    seo(
      "Privacy policy",
      "How SheRise collects, uses, stores and protects customer information.",
      "/privacy-policy",
      false,
    ),
  component: () => <InfoPage kind="privacy-policy" />,
});
