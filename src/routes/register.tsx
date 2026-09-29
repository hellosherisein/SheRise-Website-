import { createFileRoute } from "@/router-shim";
import { AuthPage } from "@/features/account-pages";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/register")({
  head: () =>
    seo(
      "register",
      "register â€” explore thoughtful care and the SheRise shopping experience.",
      "/register",
      true,
    ),
  component: () => <AuthPage mode="register" />,
});
