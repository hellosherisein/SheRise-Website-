import { createFileRoute } from "@/router-shim";
import { AccountPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/account_/addresses")({
  head: () =>
    seo(
      "My addresses",
      "My addresses â€” explore thoughtful care and the SheRise shopping experience.",
      "/account/addresses",
      true,
    ),
  component: () => <AccountPage section="addresses" />,
});
