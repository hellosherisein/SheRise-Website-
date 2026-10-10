export const adminDemoCredentials = {
  name: "Super Admin",
  email: "hello_sherise",
  passwordHash: "ba9df0fe2b12d33e2ffd2505f08a1dec28e9791d0432bc10c301d8eed0eac29e",
  role: "Owner",
};

const adminSessionKey = "sherise-admin-session";

export function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(adminSessionKey) === "active";
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function loginAdmin(email: string, password: string) {
  if (typeof window === "undefined" || !window.crypto?.subtle) return false;

  const ok =
    email.trim().toLowerCase() === adminDemoCredentials.email &&
    (await sha256(password)) === adminDemoCredentials.passwordHash;
  if (ok) {
    window.localStorage.setItem(adminSessionKey, "active");
  }
  return ok;
}

export function logoutAdmin() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(adminSessionKey);
  }
}
