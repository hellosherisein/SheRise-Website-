// Operator-only maintenance. Dry-run is the default; never run --apply without production approval.
import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { expireUnpaidOrder } from "../api/_commerce.mjs";
const apply = process.argv.includes("--apply");
if (apply && process.env.COMMERCE_MAINTENANCE_APPROVED !== "true")
  throw new Error("Set COMMERCE_MAINTENANCE_APPROVED=true only after explicit operator approval.");
const c = await createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectTimeout: 5000,
});
try {
  const [rows] = await c.query(
    "SELECT DISTINCT order_id FROM stock_allocations WHERE state = 'RESERVED' AND expires_at <= NOW() ORDER BY order_id LIMIT 100",
  );
  console.log(
    `${rows.length} expired reservation candidates. ${apply ? "Applying approved expiry transactions." : "Dry run; no changes."}`,
  );
  if (apply)
    for (const row of rows) {
      await c.beginTransaction();
      try {
        await expireUnpaidOrder(c, row.order_id);
        await c.commit();
      } catch (error) {
        await c.rollback();
        throw error;
      }
    }
} finally {
  await c.end();
}
