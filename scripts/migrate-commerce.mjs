// Additive, resumable migration runner. No database connection is made without both operator gates.
import "dotenv/config";
import fs from "node:fs";
import { createConnection } from "mysql2/promise";
const sql = fs.readFileSync(
  new URL("../database/migrations/20261029-commerce-up.sql", import.meta.url),
  "utf8",
);
if (!process.argv.includes("--apply")) {
  console.log(
    "Plan only: add four nullable product measurements and five commerce tables. No database connection or writes. Review database/migrations/20261029-commerce-up.sql and obtain approval before --apply.",
  );
  process.exit(0);
}
if (process.env.COMMERCE_MIGRATION_APPROVED !== "true")
  throw new Error(
    "Production migration requires explicit approval and COMMERCE_MIGRATION_APPROVED=true.",
  );
const c = await createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectTimeout: 5000,
});
try {
  for (const [column, definition] of [
    ["shipping_weight_g", "DECIMAL(12,3)"],
    ["package_length_cm", "DECIMAL(10,2)"],
    ["package_width_cm", "DECIMAL(10,2)"],
    ["package_height_cm", "DECIMAL(10,2)"],
  ]) {
    const [columns] = await c.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = ?",
      [column],
    );
    if (!columns.length)
      await c.execute(`ALTER TABLE products ADD COLUMN ${column} ${definition} NULL`);
  }
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("CREATE TABLE")))
    await c.execute(statement.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS "));
  console.log(
    "Additive commerce migration completed. Existing records retained. Verify schema separately before activation.",
  );
} finally {
  await c.end();
}
