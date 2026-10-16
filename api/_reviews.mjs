import { reviewPhotoUrls } from "./_review-photos.mjs";

export async function reviewsPayload(queryRows) {
  const reviews = await queryRows(`
    SELECT r.*, c.name AS customer_name,
           p.name AS product_name, o.order_number
    FROM reviews r
    LEFT JOIN customers c ON c.id = r.customer_id
    JOIN products p ON p.id = r.product_id
    LEFT JOIN orders o ON o.id = r.order_id
    WHERE r.deleted_at IS NULL ORDER BY r.created_at DESC, r.id DESC
  `);
  const count = (status) => String(reviews.filter((review) => review.status === status).length);
  return {
    title: "Reviews",
    action: "Moderate",
    columns: ["Customer", "Product", "Review", "Status", "Order", "Review ID", "Photos"],
    rows: reviews.map((review) => [
      review.customer_name || "Customer", review.product_name,
      `${review.rating}/5 - ${review.review_text}`, review.status,
      review.order_number || "-", String(review.id), JSON.stringify(reviewPhotoUrls(review)),
    ]),
    metrics: [
      { label: "Submitted Reviews", value: String(reviews.length), trend: "Customer reviews", tone: "neutral" },
      { label: "Pending", value: count("PENDING"), trend: "Awaiting approval", tone: "warn" },
      { label: "Approved", value: count("APPROVED"), trend: "Shown on website", tone: "up" },
      { label: "Rejected", value: count("REJECTED"), trend: "Hidden from website", tone: "neutral" },
    ],
    source: "mysql",
  };
}

export async function moderateReview(executeSql, input) {
  const id = typeof input?.reviewId === "string" ? input.reviewId : "";
  if (!/^[1-9][0-9]{0,19}$/.test(id) || !["PENDING", "APPROVED", "REJECTED"].includes(input?.status)) {
    throw Object.assign(new Error("A valid review and moderation status are required."), { statusCode: 400 });
  }
  const result = await executeSql(
    "UPDATE reviews SET status = ?, moderated_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [input.status, id],
  );
  if (!result.affectedRows) throw Object.assign(new Error("Review not found."), { statusCode: 404 });
}

export async function approvedReviews(queryRows) {
  const reviews = await queryRows(`
    SELECT o.order_number, c.name AS customer_name, p.name AS product_name,
           p.slug AS product_slug, r.*
    FROM reviews r
    LEFT JOIN customers c ON c.id = r.customer_id
    JOIN products p ON p.id = r.product_id AND p.deleted_at IS NULL
    JOIN orders o ON o.id = r.order_id AND o.deleted_at IS NULL AND o.order_status = 'DELIVERED'
    WHERE r.status = 'APPROVED' AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC, r.id DESC
  `);
  return reviews.map((review) => ({
    orderId: review.order_number,
    customerName: review.customer_name || "Customer",
    productName: review.product_name,
    productSlug: review.product_slug,
    rating: Number(review.rating),
    reviewText: review.review_text,
    ...(reviewPhotoUrls(review).length ? { photos: reviewPhotoUrls(review) } : {}),
    reviewedAt: review.created_at instanceof Date ? review.created_at.toISOString() : String(review.created_at),
  }));
}
