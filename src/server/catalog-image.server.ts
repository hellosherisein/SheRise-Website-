import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "./mysql.server";

// Inline legacy uploads remain in MySQL, but are downloaded independently of
// the stock/price JSON so an image cannot block adding a product to the bag.
export async function handleCatalogImageRequest(request: Request): Promise<Response> {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, allow: "GET, HEAD" } });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[1-9]\d{0,14}$/.test(id)) return new Response(null, { status: 400, headers });
  try {
    const rows = await queryRows<RowDataPacket>(`
      SELECT pi.image_url FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      JOIN product_categories c ON c.id = p.category_id
      WHERE pi.id = ? AND p.status = 'ACTIVE'
        AND p.deleted_at IS NULL AND c.deleted_at IS NULL
      LIMIT 1
    `, [id]);
    const value = rows[0]?.["image_url"];
    if (typeof value !== "string" || value.length > 16 * 1024 * 1024) return new Response(null, { status: 404, headers });
    const match = value.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/\r\n]+={0,2})$/i);
    if (!match) return new Response(null, { status: 404, headers });
    const body = Buffer.from(match[2]!, "base64");
    return new Response(request.method === "HEAD" ? null : new Uint8Array(body), {
      headers: { "content-type": match[1]!.toLowerCase(), "content-length": String(body.length),
        "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" },
    });
  } catch {
    console.error("Catalog image API failed.");
    return new Response(null, { status: 503, headers });
  }
}
