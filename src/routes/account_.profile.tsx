import { createFileRoute } from "@/router-shim";
import { AccountPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/account_/profile")({
  head: () => seo("My profile", "Manage your SheRise account.", "/account/profile", true),
  component: () => <AccountPage section="profile" />,
});
