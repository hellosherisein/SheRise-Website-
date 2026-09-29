import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/privacy-policy")({
  head: () =>
    seo(
      "privacy policy",
      "privacy policy â€” explore thoughtful care and the SheRise shopping experience.",
      "/privacy-policy",
      false,
    ),
  component: () => <InfoPage kind="privacy-policy" />,
});
