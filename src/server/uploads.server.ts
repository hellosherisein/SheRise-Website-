import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function handleProductImageUpload(request: Request): Promise<Response> {
  const formData = await request.formData();
  const files = formData.getAll("images").filter((item): item is File => item instanceof File);
  if (!files.length) return json({ urls: [] }, 400);

  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    if (!allowedTypes.has(file.type)) continue;
    const extension = extensionFromFile(file);
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeFileName(file.name, extension)}`;
    const targetPath = path.join(uploadDir, fileName);
    await writeFile(targetPath, Buffer.from(await file.arrayBuffer()));
    urls.push(`/uploads/products/${fileName}`);
  }

  return json({ urls });
}

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function safeFileName(value: string, extension: string) {
  const base = value
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
  return `${base}.${extension}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
