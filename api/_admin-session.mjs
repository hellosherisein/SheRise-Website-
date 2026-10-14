import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "sherise_admin_session";
const maxAgeSeconds = 60 * 60 * 8;

export const defaultAdminEmail = "hello_sherise";
export const defaultAdminPasswordHash = "ba9df0fe2b12d33e2ffd2505f08a1dec28e9791d0432bc10c301d8eed0eac29e";

export function requireSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }
  return secret;
}

export function createAdminCookie() {
  const secret = requireSessionSecret();
  const payload = {
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${cookieName}=${encodedPayload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearAdminCookie() {
  return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function assertAdminRequest(req) {
  const secret = requireSessionSecret();
  const cookie = parseCookies(req.headers.cookie || "")[cookieName];
  if (!cookie) throw unauthorized();

  const [encodedPayload, signature] = cookie.split(".");
  if (!encodedPayload || !signature) throw unauthorized();
  if (!safeEqual(signature, sign(encodedPayload, secret))) throw unauthorized();

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  if (payload?.sub !== "admin" || typeof payload.exp !== "number") throw unauthorized();
  if (payload.exp < Math.floor(Date.now() / 1000)) throw unauthorized();
}

export function unauthorized() {
  const error = new Error("Admin login required.");
  error.statusCode = 401;
  return error;
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), part.slice(index + 1)];
      }),
  );
}
