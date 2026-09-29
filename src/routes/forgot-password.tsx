import { createFileRoute } from "@/router-shim";
import { AuthPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/forgot-password")({
  head: () =>
    seo(
      "forgot password",
      "forgot password â€” explore thoughtful care and the SheRise shopping experience.",
      "/forgot-password",
      true,
    ),
  component: () => <AuthPage mode="forgot-password" />,
});
