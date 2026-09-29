import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { CartDrawer, Footer, Header, SearchOverlay, WelcomePopup } from "@/components/site-shell";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { LoaderDataProvider } from "@/router-shim";
import "./styles.css";

import { Route as HomeRoute } from "@/routes/index";
import { Route as AboutRoute } from "@/routes/about";
import { Route as AccountRoute } from "@/routes/account.index";
import { Route as AccountAddressesRoute } from "@/routes/account_.addresses";
import { Route as AccountOrdersRoute } from "@/routes/account_.orders";
import { Route as AccountProfileRoute } from "@/routes/account_.profile";
import { Route as AccountSecurityRoute } from "@/routes/account_.security";
import { Route as AccountWishlistRoute } from "@/routes/account_.wishlist";
import { Route as AdminRoute } from "@/routes/admin";
import { Route as AdminLoginRoute } from "@/routes/admin.login";
import { Route as BlogDetailRoute } from "@/routes/blog.$slug";
import { Route as BlogRoute } from "@/routes/blog.index";
import { Route as CartRoute } from "@/routes/cart";
import { Route as CategoryRoute } from "@/routes/category.$category";
import { Route as CheckoutRoute } from "@/routes/checkout";
import { Route as ContactRoute } from "@/routes/contact";
import { Route as FaqRoute } from "@/routes/faq";
import { Route as ForgotPasswordRoute } from "@/routes/forgot-password";
import { Route as LoginRoute } from "@/routes/login";
import { Route as OrderSuccessRoute } from "@/routes/order-success";
import { Route as PeriodGuideRoute } from "@/routes/period-guide";
import { Route as PrivacyRoute } from "@/routes/privacy-policy";
import { Route as ProductRoute } from "@/routes/products.$slug";
import { Route as RegisterRoute } from "@/routes/register";
import { Route as ResetPasswordRoute } from "@/routes/reset-password";
import { Route as ReturnRefundRoute } from "@/routes/return-refund-policy";
import { Route as SearchRoute } from "@/routes/search";
import { Route as ShippingRoute } from "@/routes/shipping-policy";
import { Route as ShopRoute } from "@/routes/shop";
import { Route as TermsRoute } from "@/routes/terms";
import { Route as WhySheRiseRoute } from "@/routes/why-sherise";
import { Route as WishlistRoute } from "@/routes/wishlist";

type RouteConfig = {
  component: React.ComponentType;
  loader?: (args: { params: Record<string, string> }) => unknown | Promise<unknown>;
  head?: (args: { loaderData?: unknown; params: Record<string, string> }) => unknown;
};

type RouteMatch = {
  route: RouteConfig;
  params: Record<string, string>;
};

const routes: Array<{ pattern: string; route: RouteConfig }> = [
  { pattern: "/", route: HomeRoute },
  { pattern: "/about", route: AboutRoute },
  { pattern: "/account", route: AccountRoute },
  { pattern: "/account/profile", route: AccountProfileRoute },
  { pattern: "/account/orders", route: AccountOrdersRoute },
  { pattern: "/account/addresses", route: AccountAddressesRoute },
  { pattern: "/account/security", route: AccountSecurityRoute },
  { pattern: "/account/wishlist", route: AccountWishlistRoute },
  { pattern: "/account_/profile", route: AccountProfileRoute },
  { pattern: "/account_/orders", route: AccountOrdersRoute },
  { pattern: "/account_/addresses", route: AccountAddressesRoute },
  { pattern: "/account_/security", route: AccountSecurityRoute },
  { pattern: "/account_/wishlist", route: AccountWishlistRoute },
  { pattern: "/admin/login", route: AdminLoginRoute },
  { pattern: "/admin", route: AdminRoute },
  { pattern: "/admin/:section", route: AdminRoute },
  { pattern: "/blog", route: BlogRoute },
  { pattern: "/blog/:slug", route: BlogDetailRoute },
  { pattern: "/cart", route: CartRoute },
  { pattern: "/category/:category", route: CategoryRoute },
  { pattern: "/checkout", route: CheckoutRoute },
  { pattern: "/contact", route: ContactRoute },
  { pattern: "/faq", route: FaqRoute },
  { pattern: "/forgot-password", route: ForgotPasswordRoute },
  { pattern: "/login", route: LoginRoute },
  { pattern: "/order-success", route: OrderSuccessRoute },
  { pattern: "/period-guide", route: PeriodGuideRoute },
  { pattern: "/privacy-policy", route: PrivacyRoute },
  { pattern: "/products/:slug", route: ProductRoute },
  { pattern: "/register", route: RegisterRoute },
  { pattern: "/reset-password", route: ResetPasswordRoute },
  { pattern: "/return-refund-policy", route: ReturnRefundRoute },
  { pattern: "/search", route: SearchRoute },
  { pattern: "/shipping-policy", route: ShippingRoute },
  { pattern: "/shop", route: ShopRoute },
  { pattern: "/terms", route: TermsRoute },
  { pattern: "/why-sherise", route: WhySheRiseRoute },
  { pattern: "/wishlist", route: WishlistRoute },
];

function App() {
  const [locationKey, setLocationKey] = useState(getLocationKey);
  const [loaderData, setLoaderData] = useState<unknown>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setLocationKey(getLocationKey());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const match = useMemo(() => matchRoute(window.location.pathname), [locationKey]);

  useEffect(() => {
    let cancelled = false;
    setError(undefined);
    setLoading(Boolean(match?.route.loader));
    Promise.resolve(match?.route.loader?.({ params: match.params }))
      .then((data) => {
        if (!cancelled) {
          setLoaderData(data);
          setLoading(false);
          applyHead(match, data);
        }
      })
      .catch((routeError) => {
        if (!cancelled) {
          setError(routeError);
          setLoaderData(undefined);
          setLoading(false);
        }
      });
    if (!match?.route.loader) {
      setLoaderData(undefined);
      applyHead(match, undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [match]);

  if (!match || error) return <NotFound />;
  const Page = match.route.component;
  const adminPage = window.location.pathname.startsWith("/admin");
  const routeLoading = loading || (Boolean(match.route.loader) && loaderData === undefined);

  return (
    <AuthProvider>
      <StoreProvider>
        <LoaderDataProvider data={loaderData}>
          {adminPage ? (
            <Page />
          ) : (
            <>
              <Header />
              <main>{routeLoading ? null : <Page />}</main>
              <Footer />
              <CartDrawer />
              <SearchOverlay />
              <WelcomePopup />
            </>
          )}
        </LoaderDataProvider>
        <Toaster richColors position="top-right" />
      </StoreProvider>
    </AuthProvider>
  );
}

function matchRoute(pathname: string): RouteMatch | null {
  for (const candidate of routes) {
    const params = matchPattern(candidate.pattern, pathname);
    if (params) return { route: candidate.route, params };
  }
  return null;
}

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = trimSlashes(pattern).split("/").filter(Boolean);
  const pathParts = trimSlashes(pathname).split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];
    if (!patternPart || !pathPart) return null;
    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }
    if (patternPart !== pathPart) return null;
  }
  return params;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function getLocationKey() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function applyHead(match: RouteMatch | null, loaderData: unknown) {
  const result = match?.route.head?.({ loaderData, params: match.params });
  const meta = typeof result === "object" && result && "meta" in result ? result.meta : undefined;
  if (!Array.isArray(meta)) return;
  const title = meta.find((item) => item && typeof item === "object" && "title" in item)?.title;
  if (typeof title === "string") document.title = title;
}

function NotFound() {
  return (
    <div className="container-shell grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <h1 className="font-display text-5xl text-brand-navy">Page not found</h1>
        <p className="mt-3 text-muted-foreground">This page is not available.</p>
        <a className="mt-6 inline-flex bg-brand-navy px-6 py-3 font-bold text-white" href="/">
          Go home
        </a>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
