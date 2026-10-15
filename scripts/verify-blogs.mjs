import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createAdminCookie } from "../api/_admin-session.mjs";

process.env.ADMIN_SESSION_SECRET = "blog-test-secret-at-least-32-characters";
for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]) process.env[key] = "test";
let blogs = [], categories = [], failWrite = false, reads = 0;
const pool = {
  async query(sql, params = []) {
    reads++;
    if (sql.includes("FROM blogs b")) {
      assert.match(sql, /b.deleted_at IS NULL/);
      let selected = blogs.filter((blog) => !blog.deleted_at);
      if (sql.includes("b.status = 'PUBLISHED'")) {
        assert.match(sql, /b.published_at <= NOW\(\)/);
        selected = selected.filter((blog) => blog.status === "PUBLISHED" && blog.published_at && new Date(blog.published_at) <= new Date());
      }
      if (params.length) selected = selected.filter((blog) => blog.slug === params[0]);
      return [structuredClone(selected.map((blog) => ({ ...blog, category_name: categories.find((category) => category.id === blog.category_id)?.name })))];
    }
    if (sql.includes("FROM blogs WHERE slug")) return [structuredClone(blogs.filter((blog) => blog.slug === params[0] && !blog.deleted_at))];
    if (sql.includes("FROM blog_categories")) return [categories.filter((category) => category.slug === params[0])];
    throw new Error(`Unexpected query: ${sql}`);
  },
  async execute(sql, params) {
    if (sql.startsWith("INSERT INTO blog_categories")) {
      categories.push({ id: categories.length + 1, name: params[0], slug: params[1] });
      return [{ insertId: categories.length }];
    }
    if (sql.startsWith("UPDATE blogs SET deleted_at")) {
      const blog = blogs.find((blog) => blog.slug === params[0] && !blog.deleted_at);
      if (blog) blog.deleted_at = new Date();
      return [{ affectedRows: blog ? 1 : 0 }];
    }
    if (sql.startsWith("INSERT INTO blogs") || sql.startsWith("UPDATE blogs SET category_id")) {
      if (failWrite) throw new Error("Simulated blog failure");
      const [category_id, title, slug, featured_image_url, short_description, content, author_name, tags, seo_title, meta_description, status, published_at, id] = params;
      if (blogs.some((blog) => blog.slug === slug && blog.id !== id)) throw Object.assign(new Error("Duplicate slug"), { code: "ER_DUP_ENTRY" });
      const existing = blogs.find((blog) => blog.id === id);
      const row = { category_id, title, slug, featured_image_url, short_description, content, author_name, tags, seo_title, meta_description, status,
        published_at: published_at || existing?.published_at || (status === "PUBLISHED" ? new Date() : null) };
      if (existing) Object.assign(existing, row);
      else blogs.push({ id: blogs.length + 1, ...row, deleted_at: null });
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected write: ${sql}`);
  },
  async getConnection() {
    let snapshot;
    return { query: pool.query, execute: pool.execute,
      async beginTransaction() { snapshot = structuredClone({ blogs, categories }); },
      async commit() {}, async rollback() { ({ blogs, categories } = snapshot); }, release() {} };
  },
};
globalThis.__blogsTestPool = pool;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
let adminSource = readFileSync(new URL("../api/admin/[module].mjs", import.meta.url), "utf8")
  .replace('import { createPool } from "mysql2/promise";', 'const createPool = () => globalThis.__blogsTestPool;');
for (const name of ["_admin-session", "_admin-orders", "_admin-errors", "_reviews", "_popup-leads", "_blogs"]) {
  adminSource = adminSource.replace(`"../${name}.mjs"`, JSON.stringify(new URL(`../api/${name}.mjs`, import.meta.url).href));
}
const { default: admin } = await import(moduleUrl(adminSource));
async function request(method = "GET", body, authenticated = true) {
  const req = { method, query: { module: "blogs" }, headers: { cookie: authenticated ? createAdminCookie().split(";")[0] : "" },
    async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body || {})); } };
  const res = { statusCode: 200, payload: undefined, setHeader() {}, status(value) { this.statusCode = value; return this; }, json(value) { this.payload = value; } };
  await admin(req, res); return res;
}
const mysqlUrl = moduleUrl('export const queryRows = async (sql, params) => (await globalThis.__blogsTestPool.query(sql, params))[0];');
let contentSource = readFileSync(new URL("../src/server/content.server.ts", import.meta.url), "utf8")
  .replace('import { faq as defaultFaqs } from "@/features/content-pages";', 'const defaultFaqs = [];')
  .replace('import { posts as defaultPosts, type BlogPost } from "@/lib/catalog";', 'const defaultPosts = [];')
  .replace('import { database, transaction } from "./database.server";', 'const database = () => { throw new Error("MySQL blogs must not use SQLite"); }; const transaction = database;')
  .replace('"../../api/_blogs.mjs"', JSON.stringify(new URL("../api/_blogs.mjs", import.meta.url).href))
  .replaceAll('"./mysql.server"', JSON.stringify(mysqlUrl));
contentSource = ts.transpileModule(contentSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { listContentBlogs, getContentBlog } = await import(moduleUrl(contentSource));
const input = { title: "Care on Busy Days", category: "Period Guide", author: "SheRise Editor", notes: "A useful summary", description: "First paragraph.\n\nSecond paragraph.",
  imageUrl: "/uploads/products/blog.jpg", metaTitle: "Care guide", metaDescription: "Helpful daily care", metaKeywords: "care, routine", status: "DRAFT" };
assert.equal((await request("POST", input, false)).statusCode, 401);
assert.equal(reads, 0);
assert.deepEqual((await request()).payload.rows, []);
assert.equal((await request("POST", input)).statusCode, 200);
assert.equal(blogs[0].slug, "care-on-busy-days");
assert.deepEqual(await listContentBlogs(), []);
assert.equal(await getContentBlog("care-on-busy-days"), undefined);
let response = await request("POST", { ...input, status: "PUBLISHED", adminAction: "update", originalKey: "care-on-busy-days" });
assert.equal(response.statusCode, 200);
assert.equal(response.payload.rows[0][7], input.description);
assert.equal(response.payload.rows[0][8], input.metaTitle);
assert.equal(response.payload.rows[0][10], "care, routine");
assert.equal(response.payload.rows[0].at(-1), "PUBLISHED");
assert.deepEqual((await getContentBlog("care-on-busy-days")).content, ["First paragraph.", "Second paragraph."]);
assert.equal((await listContentBlogs()).length, 1);
assert.equal((await request("POST", { ...input, status: "PUBLISHED" })).statusCode, 409);
assert.equal((await request("POST", { ...input, slug: "renamed-guide", status: "PUBLISHED", adminAction: "update", originalKey: "care-on-busy-days" })).statusCode, 200);
assert.equal(await getContentBlog("care-on-busy-days"), undefined);
assert.equal((await getContentBlog("renamed-guide")).title, input.title);
assert.equal((await request("POST", { ...input, title: "Future Guide", status: "PUBLISHED", publishedDate: "2099-01-01" })).statusCode, 200);
assert.equal(await getContentBlog("future-guide"), undefined);
assert.equal((await listContentBlogs()).length, 1);
assert.equal((await request("POST", { ...input, title: "Empty", description: "", status: "PUBLISHED" })).statusCode, 400);
assert.equal((await request("POST", { ...input, publishedDate: "2026-02-30" })).statusCode, 400);
assert.equal((await request("POST", { ...input, adminAction: "update", originalKey: "missing" })).statusCode, 404);
failWrite = true;
assert.equal((await request("POST", { ...input, title: "Failed Blog", category: "New category" })).statusCode, 500);
assert.equal(categories.length, 1, "Failed blog writes must roll back newly created categories");
failWrite = false;
assert.equal((await request("POST", { adminAction: "delete", originalKey: "renamed-guide" })).statusCode, 200);
assert.equal(await getContentBlog("renamed-guide"), undefined);
assert.deepEqual(await listContentBlogs(), []);
assert.equal((await request()).payload.rows.length, 1, "Deleted blogs must disappear from admin lists");
delete globalThis.__blogsTestPool;
console.log("PASS: authenticated admin blogs, drafts, publishing, full content/SEO preservation, slug edits, future visibility, validation, deletion, and rollback.");
