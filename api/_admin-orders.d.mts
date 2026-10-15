import type { mysqlTransaction, queryRows } from "../src/server/mysql.server";

export function ordersPayload(query: typeof queryRows): Promise<{
  title: string;
  action: string;
  columns: string[];
  rows: string[][];
  metrics: Array<{ label: string; value: string; trend: string; tone: string }>;
  source: "mysql";
}>;
export function updateOrderStatus(transaction: typeof mysqlTransaction, input: Record<string, unknown>): Promise<void>;
