import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

type LocationState = {
  pathname: string;
  search: Record<string, string | undefined>;
};

type RouterState = {
  location: LocationState;
};

const LoaderDataContext = createContext<unknown>(undefined);

export function LoaderDataProvider({
  data,
  children,
}: {
  data: unknown;
  children: React.ReactNode;
}) {
  return <LoaderDataContext.Provider value={data}>{children}</LoaderDataContext.Provider>;
}

type RouteArgs<T> = { params: Record<string, string>; loaderData: T };
type ViewRoute<T> = {
  component: React.ComponentType;
  loader?: (args: { params: Record<string, string> }) => T | Promise<T>;
  head?: (args: RouteArgs<T>) => unknown;
  validateSearch?: (search: Record<string, unknown>) => unknown;
};
type ApiRoute = {
  server: {
    handlers: Record<
      string,
      (args: { request: Request; params: Record<string, string> }) => Response | Promise<Response>
    >;
  };
};
export function createFileRoute(_path: string) {
  function defineRoute<T>(config: ViewRoute<T>): ViewRoute<T> & { useLoaderData: () => T };
  function defineRoute(config: ApiRoute): ApiRoute;
  function defineRoute<T>(
    config: ViewRoute<T> | ApiRoute,
  ): (ViewRoute<T> & { useLoaderData: () => T }) | ApiRoute {
    return { ...config, useLoaderData: () => useContext(LoaderDataContext) as T };
  }
  return defineRoute;
}

export function createRootRouteWithContext<T>() {
  void (undefined as T | undefined);
  return createFileRoute("/");
}

export function notFound(): Error {
  const error = new Error("Not found");
  (error as Error & { status?: number }).status = 404;
  return error;
}

export function Link({
  to,
  params,
  search,
  children,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  params?: Record<string, string | number | undefined>;
  search?: Record<string, string | number | boolean | null | undefined>;
}) {
  return (
    <a href={buildHref(to, params, search)} {...props}>
      {children}
    </a>
  );
}

export function useNavigate() {
  return (
    options: string | { to: string; replace?: boolean; search?: Record<string, unknown> },
  ) => {
    const href =
      typeof options === "string"
        ? options
        : buildHref(
            options.to,
            undefined,
            options.search as Record<string, string | number | boolean | null | undefined>,
          );
    if (typeof options !== "string" && options.replace) window.location.replace(href);
    else window.location.assign(href);
  };
}

export function useRouterState<T>({ select }: { select: (state: RouterState) => T }) {
  const state = useBrowserRouterState();
  return select(state);
}

export function useRouter() {
  return {
    invalidate: () => window.location.reload(),
  };
}

export function Outlet() {
  return null;
}

export function HeadContent() {
  return null;
}

export function Scripts() {
  return null;
}

function useBrowserRouterState(): RouterState {
  const snapshot = useSyncExternalStore(
    subscribeLocation,
    getLocationSnapshot,
    getLocationSnapshot,
  );
  return useMemo(() => {
    const url = new URL(snapshot, window.location.origin);
    return {
      location: {
        pathname: url.pathname,
        search: Object.fromEntries(url.searchParams.entries()),
      },
    };
  }, [snapshot]);
}

function subscribeLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
  };
}

function getLocationSnapshot() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function buildHref(
  to: string,
  params?: Record<string, string | number | undefined>,
  search?: Record<string, string | number | boolean | null | undefined>,
) {
  let path = to;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`$${key}`, encodeURIComponent(String(value ?? "")));
      path = path.replace(`:${key}`, encodeURIComponent(String(value ?? "")));
    }
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(search || {})) {
    if (value !== undefined && value !== null && value !== "") searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}
