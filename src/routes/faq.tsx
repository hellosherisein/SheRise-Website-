import { createFileRoute } from "@/router-shim";

import { faq as staticFaq, InfoPage } from "@/features/content-pages";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  loader: async () =>
    await fetch("/api/content/faqs")
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { faqs?: typeof staticFaq } | undefined) => payload?.faqs || staticFaq)
      .catch(() => staticFaq),
  head: () =>
    seo("faq", "faq - explore thoughtful care and the SheRise shopping experience.", "/faq", false),
  component: function FaqRoute() {
    const items = Route.useLoaderData();
    return <InfoPage kind="faq" items={items} />;
  },
});
