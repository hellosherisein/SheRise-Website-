import { createFileRoute } from "@/router-shim";

import { AdminConsole } from "./admin";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/$section")({
  head: () => seo("Admin Module", "SheRise admin management module."),
  component: AdminConsole,
});
