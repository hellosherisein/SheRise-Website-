import { createFileRoute } from "@/router-shim";
import { AuthPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/login")({
  head: () =>
    seo(
      "login",
      "login â€” explore thoughtful care and the SheRise shopping experience.",
      "/login",
      true,
    ),
  component: () => <AuthPage mode="login" />,
});
