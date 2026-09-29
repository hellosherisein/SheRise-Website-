import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/terms")({
  head: () =>
    seo(
      "Terms & conditions",
      "Terms and conditions for using the SheRise website and placing orders.",
      "/terms",
      false,
    ),
  component: () => <InfoPage kind="terms" />,
});
