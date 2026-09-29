import { createFileRoute } from "@/router-shim";
import { AccountPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/account_/wishlist")({
  head: () => seo("My wishlist", "Manage your SheRise account.", "/account/wishlist", true),
  component: () => <AccountPage section="wishlist" />,
});
