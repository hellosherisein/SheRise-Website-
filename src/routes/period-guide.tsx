import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/period-guide")({
  head: () =>
    seo(
      "period guide",
      "period guide â€” explore thoughtful care and the SheRise shopping experience.",
      "/period-guide",
      false,
    ),
  component: () => <InfoPage kind="period-guide" />,
});
