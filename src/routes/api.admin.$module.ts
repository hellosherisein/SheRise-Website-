import { createFileRoute } from "@/router-shim";

import { handleAdminRequest } from "@/server/admin.server";

export const Route = createFileRoute("/api/admin/$module")({
  server: {
    handlers: {
      GET: ({ request, params }) => handleAdminRequest(request, params.module),
      POST: ({ request, params }) => handleAdminRequest(request, params.module),
    },
  },
});
