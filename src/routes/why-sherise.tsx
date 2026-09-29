import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/why-sherise")({
  head: () =>
    seo(
      "why sherise",
      "why sherise â€” explore thoughtful care and the SheRise shopping experience.",
      "/why-sherise",
      false,
    ),
  component: () => <InfoPage kind="why-sherise" />,
});
