import { clearAdminCookie } from "../_admin-session.mjs";

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("set-cookie", clearAdminCookie());
  res.status(200).json({ ok: true });
}
