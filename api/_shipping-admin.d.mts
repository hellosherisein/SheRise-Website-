import type { queryRows, mysqlTransaction } from "../src/server/mysql.server";
export function shipmentPayload(query: typeof queryRows, orderNumber: string): Promise<unknown>;
export function shippingAdminAction(
  transaction: typeof mysqlTransaction,
  input: Record<string, unknown>,
): Promise<void>;
