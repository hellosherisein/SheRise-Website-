import type { IncomingMessage, ServerResponse } from "node:http";
import tailwindcss from "@tailwindcss/vite";
import "dotenv/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { Readable } from "node:stream";

function apiMiddlewarePlugin(): Plugin {
  const attach = (
    middlewares: {
      use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
    },
    loadModule: <T>(id: string) => Promise<T>,
  ) => {
    middlewares.use(async (req, res, next) => {
      const url = req.url || "/";
      if (!url.startsWith("/api/")) return next();
      try {
        const pathname = url.split("?")[0];
        if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
          const { default: handler } =
            pathname === "/api/admin/login"
              ? await import("./api/admin/login.mjs")
              : await import("./api/admin/logout.mjs");
          const adapter: import("./api/admin/login.mjs").NodeApiResponse = {
            setHeader(name, value) {
              res.setHeader(name, value);
            },
            status(code) {
              res.statusCode = code;
              return adapter;
            },
            json(body) {
              res.end(JSON.stringify(body));
            },
            end() {
              res.end();
            },
          };
          await handler(req, adapter);
          return;
        }
        const response = await handleApiRequest(req, loadModule);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        const body = response.body ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0);
        res.end(body);
      } catch (error) {
        console.error(error);
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "API request failed." }));
      }
    });
  };

  return {
    name: "sherise-api-middleware",
    configureServer(server) {
      attach(server.middlewares, async <T>(id: string) => (await server.ssrLoadModule(id)) as T);
    },
    configurePreviewServer(server) {
      attach(server.middlewares, () =>
        Promise.resolve({
          handlePreviewRequest: () =>
            json({ error: "API preview is available through the Vite dev server." }, 503),
        } as never),
      );
    },
  };
}

async function handleApiRequest(
  req: IncomingMessage,
  loadModule: <T>(id: string) => Promise<T>,
): Promise<Response> {
  const request = nodeRequestToWebRequest(req);
  const pathname = new URL(request.url).pathname;
  if (pathname === "/api/admin/upload-blog-image" || pathname === "/api/content/blog-image") {
    const { handleBlogImageUpload, handleBlogImageRequest } = await loadModule<
      typeof import("./src/server/blog-images.server")
    >("/src/server/blog-images.server.ts");
    return pathname === "/api/admin/upload-blog-image"
      ? handleBlogImageUpload(request)
      : handleBlogImageRequest(request);
  }
  if (pathname === "/api/reviews/image") {
    const { handleReviewImageRequest } = await loadModule<
      typeof import("./src/server/review-image.server")
    >("/src/server/review-image.server.ts");
    return handleReviewImageRequest(request);
  }
  if (pathname === "/api/catalog/product-image") {
    const { handleCatalogImageRequest } = await loadModule<
      typeof import("./src/server/catalog-image.server")
    >("/src/server/catalog-image.server.ts");
    return handleCatalogImageRequest(request);
  }
  if (pathname === "/api/shipping/ekart-webhook") {
    return new Response(
      JSON.stringify({
        error:
          "Ekart webhook verification is disabled until its signature algorithm, header and encoding are confirmed. Use authenticated tracking synchronization.",
      }),
      {
        status: request.method === "POST" ? 503 : 405,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      },
    );
  }
  if (pathname === "/api/shipping/quote") {
    const { handleShippingRequest } = await loadModule<
      typeof import("./src/server/shipping.server")
    >("/src/server/shipping.server.ts");
    return handleShippingRequest(request);
  }
  if (pathname.startsWith("/api/payments/")) {
    const { handlePaymentsRequest } = await loadModule<
      typeof import("./src/server/payments.server")
    >("/src/server/payments.server.ts");
    return handlePaymentsRequest(request);
  }

  if (pathname === "/api/admin/upload-product-image") {
    const { handleProductImageUpload } = await loadModule<
      typeof import("./src/server/uploads.server")
    >("/src/server/uploads.server.ts");
    return handleProductImageUpload(request);
  }
  if (pathname.startsWith("/api/admin/")) {
    const { handleAdminRequest } = await loadModule<typeof import("./src/server/admin.server")>(
      "/src/server/admin.server.ts",
    );
    return handleAdminRequest(request, pathname.replace("/api/admin/", ""));
  }
  if (pathname === "/api/catalog/coupons") {
    const { default: handler } = await import("./api/catalog/coupons.mjs");
    let status = 200;
    let payload: unknown;
    await handler(
      { method: request.method },
      {
        setHeader() {},
        status(value: number) {
          status = value;
          return this;
        },
        json(value: unknown) {
          payload = value;
        },
        end() {},
      },
    );
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
  if (pathname === "/api/catalog/products") {
    const { handleCatalogRequest } = await loadModule<typeof import("./src/server/catalog.server")>(
      "/src/server/catalog.server.ts",
    );
    return handleCatalogRequest(request);
  }
  if (pathname.startsWith("/api/customer/")) {
    const { handleCustomerRequest } = await loadModule<
      typeof import("./src/server/customer.server")
    >("/src/server/customer.server.ts");
    return handleCustomerRequest(request, pathname.replace("/api/customer/", ""));
  }
  if (pathname === "/api/newsletter") {
    const { handleNewsletterRequest } = await loadModule<
      typeof import("./src/server/newsletter.server")
    >("/src/server/newsletter.server.ts");
    return handleNewsletterRequest(request);
  }
  if (pathname === "/api/popup-leads") {
    const { handlePopupLeadRequest } = await loadModule<
      typeof import("./src/server/popup-leads.server")
    >("/src/server/popup-leads.server.ts");
    return handlePopupLeadRequest(request);
  }
  if (pathname === "/api/reviews") {
    const { handleReviewsRequest } = await loadModule<typeof import("./src/server/reviews.server")>(
      "/src/server/reviews.server.ts",
    );
    return handleReviewsRequest();
  }
  if (pathname === "/api/content/blogs") {
    const { listContentBlogs } = await loadModule<typeof import("./src/server/content.server")>(
      "/src/server/content.server.ts",
    );
    return json({ posts: await listContentBlogs() });
  }
  if (pathname.startsWith("/api/content/blogs/")) {
    const slug = decodeURIComponent(pathname.replace("/api/content/blogs/", ""));
    const { getContentBlog, listContentBlogs } = await loadModule<
      typeof import("./src/server/content.server")
    >("/src/server/content.server.ts");
    return json({ post: await getContentBlog(slug), related: await listContentBlogs() });
  }
  if (pathname === "/api/content/faqs") {
    const { listContentFaqs } = await loadModule<typeof import("./src/server/content.server")>(
      "/src/server/content.server.ts",
    );
    return json({ faqs: listContentFaqs() });
  }

  return json({ error: "Not found." }, 404);
}

function nodeRequestToWebRequest(req: IncomingMessage) {
  const protocol = "http";
  const host = req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url || "/"}`;
  const method = req.method || "GET";
  const headers = new Headers(req.headers as Record<string, string>);
  const body = method === "GET" || method === "HEAD" ? undefined : Readable.toWeb(req);
  return new Request(url, { method, headers, body, duplex: "half" } as RequestInit);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
});
