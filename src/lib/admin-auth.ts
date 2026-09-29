export const adminDemoCredentials = {
  name: "Super Admin",
  email: "admin@sherise.local",
  password: "admin123",
  role: "Owner",
};

const adminSessionKey = "sherise-admin-session";

export function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(adminSessionKey) === "active";
}

export function loginAdmin(email: string, password: string) {
  const ok =
    email.trim().toLowerCase() === adminDemoCredentials.email &&
    password === adminDemoCredentials.password;
  if (ok && typeof window !== "undefined") {
    window.localStorage.setItem(adminSessionKey, "active");
  }
  return ok;
}

export function logoutAdmin() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(adminSessionKey);
  }
}
