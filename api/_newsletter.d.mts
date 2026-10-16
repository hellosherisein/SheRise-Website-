import type { queryRows } from "../src/server/mysql.server";
import type { ordersPayload } from "./_admin-orders.mjs";

export function newsletterPayload(query: typeof queryRows): ReturnType<typeof ordersPayload>;
