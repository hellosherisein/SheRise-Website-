import { createFileRoute } from "@/router-shim";
import { InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/about")({
  head: () =>
    seo(
      "About SheRise | Meet Our Founder",
      "Meet the founder of SheRise and discover her vision for menstrual dignity, holistic wellness, confidence and women's empowerment.",
      "/about",
      false,
    ),
  component: () => <InfoPage kind="about" />,
});
