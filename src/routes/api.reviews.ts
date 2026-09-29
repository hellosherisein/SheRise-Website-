import { createFileRoute } from "@/router-shim";

import { handleReviewsRequest } from "@/server/reviews.server";

export const Route = createFileRoute("/api/reviews")({
  server: {
    handlers: {
      GET: () => handleReviewsRequest(),
    },
  },
});
