import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/terms")({
  head: () =>
    seo(
      "terms",
      "terms â€” explore thoughtful care and the SheRise shopping experience.",
      "/terms",
      false,
    ),
  component: () => <InfoPage kind="terms" />,
});
