import { createFileRoute } from "@/router-shim";

import { handlePopupLeadRequest } from "@/server/popup-leads.server";

export const Route = createFileRoute("/api/popup-leads")({
  server: {
    handlers: {
      POST: ({ request }) => handlePopupLeadRequest(request),
    },
  },
});
