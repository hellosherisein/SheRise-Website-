// Operator-only queue processor / authenticated tracking poller. Default mode performs no I/O.
import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { createShipment, syncTracking } from "../api/_ekart-shipments.mjs";
const create = process.argv.includes("--run"),
  track = process.argv.includes("--sync");
if (!create && !track) {
  console.log(
    "Plan only. --run processes QUEUED shipments after explicit approval and EKART_SHIPPING_ENABLED=true; --sync polls existing shipments. Neither mode has been executed.",
  );
  process.exit(0);
}
if (process.env.EKART_WORKER_APPROVED !== "true")
  throw new Error("Operator approval and EKART_WORKER_APPROVED=true are required.");
if (create && process.env.EKART_SHIPPING_ENABLED !== "true")
  throw new Error("Live shipment creation is disabled.");
const c = await createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectTimeout: 5000,
});
const transaction = async (work) => {
  await c.beginTransaction();
  try {
    const result = await work(c);
    await c.commit();
    return result;
  } catch (error) {
    await c.rollback();
    throw error;
  }
};
try {
  const [rows] = await c.query(
    `SELECT o.order_number FROM ekart_shipments s JOIN orders o ON o.id = s.order_id WHERE o.deleted_at IS NULL AND s.status = ? AND o.order_status NOT IN ('CANCELLED','RETURNED','REFUNDED') ORDER BY s.updated_at, s.order_id LIMIT 50`,
    [track ? "CREATED" : "QUEUED"],
  );
  for (const row of rows) {
    try {
      if (track) await syncTracking(transaction, row.order_number);
      else await createShipment(transaction, row.order_number);
      console.log(`${row.order_number}: ${track ? "tracking synchronized" : "shipment processed"}`);
    } catch {
      console.error(
        `${row.order_number}: processing failed; inspect authenticated admin details. No automatic creation retry.`,
      );
    }
  }
} finally {
  await c.end();
}
