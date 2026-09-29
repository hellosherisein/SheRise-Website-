import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/about")({
  head: () =>
    seo(
      "about",
      "about â€” explore thoughtful care and the SheRise shopping experience.",
      "/about",
      false,
    ),
  component: () => <InfoPage kind="about" />,
});
