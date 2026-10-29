import type { queryRows, mysqlTransaction } from "../src/server/mysql.server";
export function createShipment(
  transaction: typeof mysqlTransaction,
  orderNumber: string,
): Promise<unknown>;
export function syncTracking(
  transaction: typeof mysqlTransaction,
  orderNumber: string,
): Promise<unknown>;
export function reconcileShipment(
  transaction: typeof mysqlTransaction,
  orderNumber: string,
  trackingId: string,
): Promise<unknown>;
export function shipmentLabel(query: typeof queryRows, orderNumber: string): Promise<Buffer>;
