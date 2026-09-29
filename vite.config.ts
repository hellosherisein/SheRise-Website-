import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { Readable } from "node:stream";

function apiMiddlewarePlugin(): Plugin {
  const attach = (
    middlewares: { use: (handler: (req: any, res: any, next: () => void) => void) => void },
    loadModule: <T>(id: string) => Promise<T>,
  ) => {
    middlewares.use(async (req, res, next) => {
      const url = req.url || "/";
      if (!url.startsWith("/api/")) return next();
      try {
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
      attach(server.middlewares, (id) => server.ssrLoadModule(id));
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
  req: any,
  loadModule: <T>(id: string) => Promise<T>,
): Promise<Response> {
  const request = nodeRequestToWebRequest(req);
  const pathname = new URL(request.url).pathname;

  if (pathname === "/api/admin/upload-product-image") {
    const { handleProductImageUpload } = await loadModule<typeof import("./src/server/uploads.server")>(
      "/src/server/uploads.server.ts",
    );
    return handleProductImageUpload(request);
  }
  if (pathname.startsWith("/api/admin/")) {
    const { handleAdminRequest } = await loadModule<typeof import("./src/server/admin.server")>(
      "/src/server/admin.server.ts",
    );
    return handleAdminRequest(request, pathname.replace("/api/admin/", ""));
  }
  if (pathname === "/api/catalog/products") {
    const { handleCatalogRequest } = await loadModule<typeof import("./src/server/catalog.server")>(
      "/src/server/catalog.server.ts",
    );
    return handleCatalogRequest();
  }
  if (pathname.startsWith("/api/customer/")) {
    const { handleCustomerRequest } = await loadModule<typeof import("./src/server/customer.server")>(
      "/src/server/customer.server.ts",
    );
    return handleCustomerRequest(request, pathname.replace("/api/customer/", ""));
  }
  if (pathname === "/api/newsletter") {
    const { handleNewsletterRequest } = await loadModule<typeof import("./src/server/newsletter.server")>(
      "/src/server/newsletter.server.ts",
    );
    return handleNewsletterRequest(request);
  }
  if (pathname === "/api/popup-leads") {
    const { handlePopupLeadRequest } = await loadModule<typeof import("./src/server/popup-leads.server")>(
      "/src/server/popup-leads.server.ts",
    );
    return handlePopupLeadRequest(request);
  }
  if (pathname === "/api/reviews") {
    const { handleReviewsRequest } = await loadModule<typeof import("./src/server/reviews.server")>(
      "/src/server/reviews.server.ts",
    );
    return handleReviewsRequest(request);
  }
  if (pathname === "/api/content/blogs") {
    const { listContentBlogs } = await loadModule<typeof import("./src/server/content.server")>(
      "/src/server/content.server.ts",
    );
    return json({ posts: listContentBlogs() });
  }
  if (pathname.startsWith("/api/content/blogs/")) {
    const slug = decodeURIComponent(pathname.replace("/api/content/blogs/", ""));
    const { getContentBlog, listContentBlogs } = await loadModule<typeof import("./src/server/content.server")>(
      "/src/server/content.server.ts",
    );
    return json({ post: getContentBlog(slug), related: listContentBlogs() });
  }
  if (pathname === "/api/content/faqs") {
    const { listContentFaqs } = await loadModule<typeof import("./src/server/content.server")>(
      "/src/server/content.server.ts",
    );
    return json({ faqs: listContentFaqs() });
  }

  return json({ error: "Not found." }, 404);
}

function nodeRequestToWebRequest(req: any) {
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
