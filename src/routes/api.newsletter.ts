import { createFileRoute } from "@/router-shim";

import { handleNewsletterRequest } from "@/server/newsletter.server";

export const Route = createFileRoute("/api/newsletter")({
  server: {
    handlers: {
      POST: ({ request }) => handleNewsletterRequest(request),
    },
  },
});
