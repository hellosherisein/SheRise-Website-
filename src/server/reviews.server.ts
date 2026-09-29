import { getProduct } from "@/lib/catalog";
import type { CustomerOrder, OrderReview } from "@/lib/customer-types";

import { database } from "./database.server";

export type PublicReview = {
  orderId: string;
  customerName: string;
  productName: string;
  productSlug: string;
  rating: number;
  reviewText: string;
  reviewedAt: string;
};

function safeOrder(data: string) {
  try {
    return JSON.parse(data) as CustomerOrder;
  } catch {
    return null;
  }
}

export function collectApprovedReviews(): PublicReview[] {
  const rows = database()
    .prepare(
      `
        SELECT o.id, o.data, c.name AS customer_name
        FROM orders o
        JOIN customers c ON c.id = o.user_id
        ORDER BY o.rowid DESC
      `,
    )
    .all() as Array<{ id: string; data: string; customer_name: string }>;

  return rows.flatMap((row) => {
    const order = safeOrder(row.data);
    if (!order) return [];
    return (order.reviews ?? [])
      .filter((review) => review.status === "APPROVED")
      .map((review) => {
        const item = order.items.find((product) => product.slug === review.slug);
        const product = getProduct(review.slug);
        return {
          orderId: row.id,
          customerName: row.customer_name,
          productName: item?.name || product?.name || review.slug,
          productSlug: review.slug,
          rating: review.rating,
          reviewText: review.reviewText,
          reviewedAt: review.reviewedAt,
        };
      });
  });
}

export function reviewStatus(review: OrderReview) {
  return review.status ?? "PENDING";
}

export function handleReviewsRequest(): Response {
  return new Response(JSON.stringify({ reviews: collectApprovedReviews() }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
