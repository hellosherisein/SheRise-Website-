import { createFileRoute } from "@/router-shim";
import { AccountPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/account_/security")({
  head: () => seo("My security", "Manage your SheRise account.", "/account/security", true),
  component: () => <AccountPage section="security" />,
});
