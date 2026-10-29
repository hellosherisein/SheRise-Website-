import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "./mysql.server";
import { mysqlSessionUser } from "./customer.server";
import { assertAdminRequest } from "../../api/_admin-session.mjs";
import { storedReviewPhotos, validateReviewPhotos } from "../../api/_review-photos.mjs";

export async function handleReviewImageRequest(request: Request): Promise<Response> {
  const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
  if (!["GET", "HEAD"].includes(request.method))
    return new Response(null, { status: 405, headers });
  const params = new URL(request.url).searchParams;
  const id = params.get("review") || "",
    index = params.get("index") || "";
  if (!/^[1-9]\d{0,19}$/.test(id) || !/^[0-2]$/.test(index))
    return new Response(null, { status: 400, headers });
  try {
    const rows = await queryRows<RowDataPacket>(
      `
      SELECT r.review_images, r.customer_id, r.status, o.order_status
      FROM reviews r JOIN orders o ON o.id = r.order_id AND o.deleted_at IS NULL
      JOIN products p ON p.id = r.product_id AND p.deleted_at IS NULL
      WHERE r.id = ? AND r.deleted_at IS NULL LIMIT 1
    `,
      [id],
    );
    const review = rows[0];
    if (!review) return new Response(null, { status: 404, headers });
    let allowed = review["status"] === "APPROVED" && review["order_status"] === "DELIVERED";
    if (!allowed) {
      try {
        assertAdminRequest({ headers: { cookie: request.headers.get("cookie") || "" } });
        allowed = true;
      } catch {
        /* Customer ownership is checked below. */
      }
      if (!allowed)
        allowed = String((await mysqlSessionUser(request))?.id) === String(review["customer_id"]);
    }
    if (!allowed) return new Response(null, { status: 404, headers });
    const photo = storedReviewPhotos(review["review_images"])[Number(index)];
    if (!photo) return new Response(null, { status: 404, headers });
    validateReviewPhotos([photo]);
    const [metadata, encoded] = photo.split(",");
    const bytes = Buffer.from(encoded!, "base64");
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), {
      headers: {
        ...headers,
        "content-type": metadata!.slice(5).split(";")[0]!,
        "content-length": String(bytes.length),
      },
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    return new Response(null, { status: code === "ER_BAD_FIELD_ERROR" ? 404 : 503, headers });
  }
}
