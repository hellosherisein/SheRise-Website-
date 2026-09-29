import { createFileRoute, useNavigate } from "@/router-shim";
import { Eye, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminDemoCredentials,
  isAdminAuthenticated,
  loginAdmin,
} from "@/lib/admin-auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/login")({
  head: () => seo("Admin Login", "Secure SheRise admin login.", "/admin/login", true),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(adminDemoCredentials.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdminAuthenticated()) void navigate({ to: "/admin", replace: true });
  }, [navigate]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginAdmin(email, password)) {
      setError("Invalid admin username or password.");
      return;
    }
    setError("");
    toast.success("Admin login successful.");
    void navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="grid min-h-screen bg-[#f7f4f0] text-brand-navy lg:grid-cols-[minmax(0,0.9fr)_minmax(430px,0.55fr)]">
      <section className="hidden border-r border-[#eadbd2] bg-[#fffaf6] px-12 py-10 lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="font-display text-4xl leading-none">
            She<span className="text-brand-coral">Rise</span>
          </p>
          <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">
            Commerce Admin
          </p>
        </div>
        <div className="max-w-xl">
          <div className="mb-8 grid size-16 place-items-center rounded-full bg-brand-blush">
            <ShieldCheck className="size-8 text-brand-burgundy" />
          </div>
          <h1 className="font-display text-5xl leading-tight">Admin access for store operations.</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
            Manage products, orders, inventory, website content, enquiries and settings from one
            focused dashboard.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Demo protected admin area</p>
      </section>

      <main className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md border border-[#eadbd2] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase text-brand-burgundy">Admin Login</p>
            <h2 className="mt-2 font-display text-4xl">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue to SheRise admin dashboard.
            </p>
          </div>

          <div className="mb-5 border border-[#eadbd2] bg-[#fffaf6] p-4 text-sm">
            <p className="font-semibold">Demo username and password</p>
            <p className="mt-2 text-muted-foreground">
              Username: <span className="font-mono text-brand-navy">{adminDemoCredentials.email}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Password: <span className="font-mono text-brand-navy">{adminDemoCredentials.password}</span>
            </p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Username / Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-none border-[#e4d5cc] bg-[#fffaf6] pl-10"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-none border-[#e4d5cc] bg-[#fffaf6] pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <Eye className="size-4" />
                </button>
              </div>
            </div>

            {error ? (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="h-11 w-full">
              Login to Admin
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
