import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows, executeSql } from "./mysql.server";
import { assertAdminRequest } from "../../api/_admin-session.mjs";

const limit = 5 * 1024 * 1024;
export const blogImageSchema = `CREATE TABLE IF NOT EXISTS blog_media (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  mime_type VARCHAR(40) NOT NULL, image_data MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
let initialized: Promise<void> | undefined;
function isAdmin(request: Request) {
  try {
    assertAdminRequest({ headers: { cookie: request.headers.get("cookie") || "" } });
    return true;
  } catch {
    return false;
  }
}
async function ensureStorage() {
  initialized ??= queryRows("SELECT id FROM blog_media LIMIT 0")
    .then(() => {})
    .catch(async (error) => {
      if (error.code !== "ER_NO_SUCH_TABLE") throw error;
      await executeSql(blogImageSchema);
    })
    .catch((error) => {
      initialized = undefined;
      throw error;
    });
  await initialized;
}

export async function handleBlogImageUpload(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!isAdmin(request)) return json({ error: "Admin login required." }, 401);
  try {
    const expectedOrigin = new URL(process.env["APP_ORIGIN"] || request.url).origin;
    if (
      request.headers.get("origin") !== expectedOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return json({ error: "Request origin not allowed." }, 403);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
      return json({ error: "Choose an image file." }, 400);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Choose an image file." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit + 65536) {
        await reader.cancel();
        return json({ error: "Choose an image under 5 MB." }, 413);
      }
      chunks.push(value);
    }
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
        headers: { "content-type": request.headers.get("content-type")! },
      }).formData();
    } catch {
      return json({ error: "Could not read image upload." }, 400);
    }
    const files = form.getAll("images");
    const file = files[0];
    if (files.length !== 1 || !(file instanceof File))
      return json({ error: "Choose one image." }, 400);
    if (!file.size || file.size > limit) return json({ error: "Choose an image under 5 MB." }, 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid =
      file.type === "image/jpeg"
        ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
        : file.type === "image/png"
          ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : file.type === "image/webp" &&
            bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP";
    if (!valid) return json({ error: "Use a valid JPG, PNG or WebP image." }, 400);
    await ensureStorage();
    const id = randomUUID();
    await executeSql("INSERT INTO blog_media (id, mime_type, image_data) VALUES (?, ?, ?)", [
      id,
      file.type,
      bytes,
    ]);
    return json({ urls: [`/api/content/blog-image?id=${id}`] });
  } catch (error) {
    if ((error as { status?: number }).status === 403)
      return json({ error: "Request origin not allowed." }, 403);
    console.error(
      "Blog image upload failed:",
      (error as { code?: string }).code || "UPLOAD_FAILED",
    );
    return json({ error: "Could not save blog image. Please retry." }, 503);
  }
}

export async function handleBlogImageRequest(request: Request): Promise<Response> {
  const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
  if (!["GET", "HEAD"].includes(request.method))
    return new Response(null, { status: 405, headers });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))
    return new Response(null, { status: 400, headers });
  try {
    const admin = isAdmin(request);
    const rows = await queryRows<RowDataPacket>(
      `SELECT m.mime_type, m.image_data FROM blog_media m WHERE m.id = ?
      ${admin ? "" : `AND EXISTS (SELECT 1 FROM blogs b WHERE b.featured_image_url = ? AND b.deleted_at IS NULL AND b.status = 'PUBLISHED' AND b.published_at <= NOW())`} LIMIT 1`,
      admin ? [id] : [id, `/api/content/blog-image?id=${id}`],
    );
    const row = rows[0];
    if (!row || !["image/jpeg", "image/png", "image/webp"].includes(row["mime_type"]))
      return new Response(null, { status: 404, headers });
    const bytes = row["image_data"] as Buffer;
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), {
      headers: {
        ...headers,
        "content-type": row["mime_type"],
        "content-length": String(bytes.length),
      },
    });
  } catch (error) {
    return new Response(null, {
      status: (error as { code?: string }).code === "ER_NO_SUCH_TABLE" ? 404 : 503,
      headers,
    });
  }
}
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
