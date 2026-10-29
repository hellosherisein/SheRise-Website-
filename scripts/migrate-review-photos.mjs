import "dotenv/config";
import { createConnection } from "mysql2/promise";

const connection = await createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
try {
  const [columns] = await connection.query("SHOW COLUMNS FROM reviews LIKE 'review_images'");
  if (!columns.length)
    await connection.execute("ALTER TABLE reviews ADD COLUMN review_images JSON NULL");
  console.log("Review photo storage ready; existing reviews preserved.");
} finally {
  await connection.end();
}
