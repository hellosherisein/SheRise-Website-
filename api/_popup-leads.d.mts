import type { queryRows } from "../src/server/mysql.server";
import type { ordersPayload } from "./_admin-orders.mjs";

export function popupLeadsPayload(query: typeof queryRows): Promise<Awaited<ReturnType<typeof ordersPayload>> & { notificationIds: string[] }>;
