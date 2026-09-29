import { createFileRoute } from "@/router-shim";

import { handleProductImageUpload } from "@/server/uploads.server";

export const Route = createFileRoute("/api/admin/upload-product-image")({
  server: {
    handlers: {
      POST: ({ request }) => handleProductImageUpload(request),
    },
  },
});
