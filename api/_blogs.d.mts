import type { RowDataPacket } from "mysql2/promise";
import type { executeSql, queryRows, mysqlTransaction } from "../src/server/mysql.server";
import type { BlogPost } from "../src/lib/catalog";
import type { ordersPayload } from "./_admin-orders.mjs";

export function listBlogs(query: typeof queryRows, options?: { includeInactive?: boolean; slug?: string }): Promise<RowDataPacket[]>;
export function blogToPost(blog: RowDataPacket): BlogPost;
export function blogsPayload(query: typeof queryRows): ReturnType<typeof ordersPayload>;
export function upsertBlog(transaction: typeof mysqlTransaction, input: Record<string, unknown>): Promise<void>;
export function deleteBlog(execute: typeof executeSql, input: Record<string, unknown>): Promise<void>;
