import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { paymentSchema } from "../src/server/payment-schema.server.ts";

const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE"];
if (required.some((name) => !process.env[name]))
  throw new Error("Configure MySQL environment variables before running this migration.");
const connection = await createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE,
});
try {
  for (const sql of paymentSchema) await connection.execute(sql);
  console.log("Razorpay checkout and webhook tables are ready. Existing data was preserved.");
} finally {
  await connection.end();
}
