import { createHash, timingSafeEqual } from "node:crypto";

import {
  createAdminCookie,
  defaultAdminEmail,
  defaultAdminPasswordHash,
} from "../_admin-session.mjs";

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const expectedEmail = String(process.env.ADMIN_USERNAME || defaultAdminEmail).trim().toLowerCase();
    const expectedHash = String(process.env.ADMIN_PASSWORD_HASH || defaultAdminPasswordHash);

    if (email !== expectedEmail || !safeEqual(sha256(password), expectedHash)) {
      res.status(401).json({ error: "Invalid admin credentials." });
      return;
    }

    res.setHeader("set-cookie", createAdminCookie());
    res.status(200).json({ ok: true });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({ error: statusCode === 500 ? "Admin login is not configured." : error.message });
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function setJsonHeaders(res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
}
