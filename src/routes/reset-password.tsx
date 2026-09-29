import { createFileRoute } from "@/router-shim";
import { AuthPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/reset-password")({
  head: () =>
    seo(
      "Reset password",
      "Choose a new password for your SheRise account.",
      "/reset-password",
      true,
    ),
  component: () => <AuthPage mode="reset-password" />,
});
