import { createPool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

const pool = createPool({
  host: process.env["MYSQL_HOST"] || "127.0.0.1",
  port: Number(process.env["MYSQL_PORT"] || 3306),
  user: process.env["MYSQL_USER"] || "root",
  password: process.env["MYSQL_PASSWORD"] || "root",
  database: process.env["MYSQL_DATABASE"] || "sherise_db",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export async function queryRows<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}

export async function executeSql(sql: string, params: unknown[] = []) {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}
