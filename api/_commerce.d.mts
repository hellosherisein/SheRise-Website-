import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { queryRows, executeSql } from "../src/server/mysql.server";
import type { Product } from "../src/lib/catalog";
export type CommerceConfig = {
  codMinimum: number;
  codMaximum: number;
  pickupPin: string;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  freeShippingThreshold: number | null;
  shippingPolicy: "CARRIER" | "FREE_THRESHOLD";
  pricingPlan: string;
  pricingConfirmed: boolean;
  courierGroup: string;
  serviceType: "SURFACE" | "EXPRESS";
  pickupCity: string;
  pickupState: string;
  sellerName: string;
  sellerAddress: string;
  sellerGstTin: string;
  sellerTaxStatus: "UNCONFIGURED" | "REGISTERED" | "UNREGISTERED";
  categoryOfGoods: string;
  packages: Array<{
    name: string;
    maxUnits: number;
    maxWeightG: number;
    tareWeightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  }>;
};
export type CommerceItem = { product: Product; quantity: number; price: number };
export function commerceError(
  status: number,
  message: string,
): Error & { status: number; statusCode: number };
export function jsonValue(value: unknown): Record<string, unknown>;
export function readCommerceConfig(
  query: (sql: string, params?: unknown[]) => Promise<RowDataPacket[]>,
): Promise<CommerceConfig>;
export function commerceSettingsPayload(
  query: (sql: string, params?: unknown[]) => Promise<RowDataPacket[]>,
): Promise<{
  title: string;
  action: string;
  source: "mysql";
  config: CommerceConfig;
  columns: string[];
  rows: string[][];
  metrics: [];
}>;
export function saveCommerceConfig(execute: typeof executeSql, input: unknown): Promise<void>;
export function validateCoupon(
  connection: PoolConnection,
  code: string,
  customerId: string | number,
  items: CommerceItem[],
): Promise<{
  id: number;
  discount: number;
  eligibleProductIds: string[];
  eligibleSubtotal: number;
} | null>;
export function reserveStock(
  connection: PoolConnection,
  orderId: number,
  items: CommerceItem[],
  prepaid: boolean,
): Promise<void>;
export function transitionStock(
  connection: PoolConnection,
  orderId: number,
  action: "commit" | "release" | "restock",
): Promise<void>;
export function queueShipment(connection: PoolConnection, order: RowDataPacket): Promise<void>;

export function productTax(
  items: CommerceItem[],
  coupon: { discount: number; eligibleProductIds: string[]; eligibleSubtotal: number } | null,
): number;
export function expireUnpaidOrder(connection: PoolConnection, orderId: number): Promise<boolean>;

export function selectPackage(
  items: CommerceItem[],
  packages: CommerceConfig["packages"],
): { weightG: number; lengthCm: number; widthCm: number; heightCm: number };
