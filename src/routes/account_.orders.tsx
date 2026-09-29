import { createFileRoute } from "@/router-shim";
import { AccountPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/account_/orders")({
  head: () =>
    seo(
      "My orders",
      "My orders â€” explore thoughtful care and the SheRise shopping experience.",
      "/account/orders",
      true,
    ),
  component: () => <AccountPage section="orders" />,
});
