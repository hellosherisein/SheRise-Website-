import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/contact")({
  head: () =>
    seo(
      "contact",
      "contact â€” explore thoughtful care and the SheRise shopping experience.",
      "/contact",
      false,
    ),
  component: () => <InfoPage kind="contact" />,
});
