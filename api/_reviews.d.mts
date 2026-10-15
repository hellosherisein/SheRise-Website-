import type { executeSql, queryRows } from "../src/server/mysql.server";
import type { PublicReview } from "../src/server/reviews.server";
import type { ordersPayload } from "./_admin-orders.mjs";

export function reviewsPayload(query: typeof queryRows): ReturnType<typeof ordersPayload>;
export function moderateReview(execute: typeof executeSql, input: Record<string, unknown>): Promise<void>;
export function approvedReviews(query: typeof queryRows): Promise<PublicReview[]>;
