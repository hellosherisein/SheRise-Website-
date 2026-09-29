import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
let connection: DatabaseSync | undefined;
export function database() {
  if (connection) return connection;
  const path = resolve(process.env["SHERISE_DATABASE_PATH"] || "data/sherise.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,phone TEXT UNIQUE,whatsapp_number TEXT NOT NULL DEFAULT '',password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
 CREATE TABLE IF NOT EXISTS addresses(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS addresses_user ON addresses(user_id);
 CREATE TABLE IF NOT EXISTS wishlists(user_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,slug TEXT NOT NULL,PRIMARY KEY(user_id,slug));
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,request_id TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(user_id,request_id));
 CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
 CREATE TABLE IF NOT EXISTS popup_leads(id TEXT PRIMARY KEY,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS popup_leads_created ON popup_leads(created_at);
 CREATE TABLE IF NOT EXISTS newsletter_subscribers(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,source TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS newsletter_subscribers_created ON newsletter_subscribers(created_at);
 CREATE TABLE IF NOT EXISTS content_blogs(id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,title TEXT NOT NULL,category TEXT NOT NULL,author TEXT NOT NULL,published_date TEXT NOT NULL,image_url TEXT NOT NULL,excerpt TEXT NOT NULL,content TEXT NOT NULL,meta_title TEXT NOT NULL DEFAULT '',meta_description TEXT NOT NULL DEFAULT '',meta_keywords TEXT NOT NULL DEFAULT '',status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS content_blogs_status ON content_blogs(status,published_date);
 CREATE TABLE IF NOT EXISTS content_faqs(id TEXT PRIMARY KEY,question TEXT NOT NULL UNIQUE,answer TEXT NOT NULL,status TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS content_faqs_status ON content_faqs(status,sort_order);
 CREATE TABLE IF NOT EXISTS inventory_overrides(sku TEXT PRIMARY KEY,stock INTEGER NOT NULL,low_stock_threshold INTEGER NOT NULL DEFAULT 5,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reset_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
 PRAGMA user_version=1;`);
  let customerColumns = db.prepare("PRAGMA table_info(customers)").all() as Array<{ name: string; notnull: number }>;
  if (!customerColumns.some((column) => column.name === "whatsapp_number")) {
    db.exec("ALTER TABLE customers ADD COLUMN whatsapp_number TEXT NOT NULL DEFAULT ''");
    customerColumns = db.prepare("PRAGMA table_info(customers)").all() as Array<{ name: string; notnull: number }>;
  }
  if (customerColumns.some((column) => column.name === "phone" && column.notnull === 1)) {
    db.exec(`PRAGMA foreign_keys=OFF;
 CREATE TABLE customers_new(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,phone TEXT UNIQUE,whatsapp_number TEXT NOT NULL DEFAULT '',password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
 INSERT INTO customers_new(id,name,email,phone,whatsapp_number,password_hash,created_at)
   SELECT id,name,email,NULLIF(phone,''),COALESCE(whatsapp_number,''),password_hash,created_at FROM customers;
 DROP TABLE customers;
 ALTER TABLE customers_new RENAME TO customers;
 PRAGMA foreign_keys=ON;`);
  }
  connection = db;
  return db;
}
export function transaction<T>(work: () => T): T {
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
