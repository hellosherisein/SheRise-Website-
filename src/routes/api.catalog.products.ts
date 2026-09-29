import { createFileRoute } from "@/router-shim";

import { handleCatalogRequest } from "@/server/catalog.server";

export const Route = createFileRoute("/api/catalog/products")({
  server: {
    handlers: {
      GET: () => handleCatalogRequest(),
    },
  },
});
