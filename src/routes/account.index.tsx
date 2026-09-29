import { createFileRoute } from "@/router-shim";
import { AccountPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/account/")({
  head: () => seo("My account", "My account", "/account", true),
  component: () => <AccountPage section="overview" />,
});
