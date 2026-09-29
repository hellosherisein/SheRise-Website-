import { createFileRoute } from "@/router-shim";
import { handleCustomerRequest } from "@/server/customer.server";
export const Route = createFileRoute("/api/customer/$action")({
  server: {
    handlers: {
      GET: ({ request, params }) => handleCustomerRequest(request, params.action),
      POST: ({ request, params }) => handleCustomerRequest(request, params.action),
    },
  },
});
