import { createServer as createHttpServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 3000);
if (process.env.RAZORPAY_ENABLED === "true") {
  try {
    const { validatePaymentEnvironment } = await loadProductionApi();
    try {
      validatePaymentEnvironment();
    } catch (error) {
      // Validation messages contain variable names/rules only, never their values.
      console.error("Online payments disabled:", error.message);
      process.env.RAZORPAY_ENABLED = "false";
    }
  } catch {
    console.error("Online payments disabled: payment API could not load. Check the server build and Node.js version.");
    process.env.RAZORPAY_ENABLED = "false";
  }
}

const server = createHttpServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (await handleNodeApiRequest(req, res, requestUrl.pathname)) {
      return;
    }
    if (requestUrl.pathname.startsWith("/api/")) {
      await sendWebResponse(res, await handleApiRequest(req));
      return;
    }

    const staticResponse = await staticFileResponse(requestUrl.pathname);
    await sendWebResponse(res, staticResponse || (await indexResponse()));
  } catch (error) {
    console.error("Production server failed:", error);
    await sendWebResponse(
      res,
      json({ error: "Server request failed." }, 500),
    );
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`SheRise server listening on port ${server.address().port}`);
});

async function handleNodeApiRequest(req, res, pathname) {
  const adminModuleMatch = pathname.match(/^\/api\/admin\/([^/]+)$/);
  if (pathname === "/api/admin/login") {
    const { default: handleAdminLogin } = await import("../api/admin/login.mjs");
    await handleAdminLogin(req, responseAdapter(res));
    return true;
  }
  if (pathname === "/api/admin/logout") {
    const { default: handleAdminLogout } = await import("../api/admin/logout.mjs");
    await handleAdminLogout(req, responseAdapter(res));
    return true;
  }
  if (adminModuleMatch && !["/api/admin/upload-product-image", "/api/admin/upload-blog-image"].includes(pathname)) {
    const { default: handleAdminModule } = await import("../api/admin/[module].mjs");
    req.query = { module: decodeURIComponent(adminModuleMatch[1]) };
    await handleAdminModule(req, responseAdapter(res));
    return true;
  }
  if (pathname === "/api/catalog/products") {
    const { default: handleCatalogProducts } = await import("../api/catalog/products.mjs");
    await handleCatalogProducts(req, responseAdapter(res));
    return true;
  }
  if (pathname === "/api/catalog/coupons") {
    const { default: handleCatalogCoupons } = await import("../api/catalog/coupons.mjs");
    await handleCatalogCoupons(req, responseAdapter(res));
    return true;
  }
  return false;
}

async function handleApiRequest(req) {
  const request = nodeRequestToWebRequest(req);
  const { handleProductionApiRequest } = await loadProductionApi();
  return handleProductionApiRequest(request);
}

function responseAdapter(res) {
  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };
  res.json = (body) => {
    if (!res.getHeader("content-type")) {
      res.setHeader("content-type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(body));
  };
  return res;
}

async function loadProductionApi() {
  return import("../dist/server/production-api.js");
}

function nodeRequestToWebRequest(req) {
  const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url || "/"}`;
  const method = req.method || "GET";
  const headers = new Headers(req.headers);
  const body = method === "GET" || method === "HEAD" ? undefined : Readable.toWeb(req);
  return new Request(url, { method, headers, body, duplex: "half" });
}

async function staticFileResponse(pathname) {
  const safePath = safeStaticPath(pathname);
  if (!safePath) return undefined;

  const candidates = [
    path.join(distDir, safePath),
    path.join(publicDir, safePath),
  ];

  for (const candidate of candidates) {
    if (!isInside(candidate, candidate.startsWith(distDir) ? distDir : publicDir)) continue;
    const file = await fileStat(candidate);
    if (!file || file.isDirectory()) continue;
    return new Response(await readFile(candidate), {
      headers: {
        "content-type": contentType(candidate),
        "cache-control": candidate.includes(`${path.sep}assets${path.sep}`)
          ? "public, max-age=31536000, immutable"
          : "public, max-age=300",
      },
    });
  }

  return undefined;
}

async function indexResponse() {
  return new Response(await readFile(path.join(distDir, "index.html")), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const body = response.body ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0);
  res.end(body);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function fileStat(filePath) {
  try {
    return await stat(filePath);
  } catch {
    return undefined;
  }
}

function safeStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0] || "/");
  if (decoded.includes("\0")) return undefined;
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, "");
  if (!normalized || normalized === ".") return "index.html";
  if (normalized.startsWith("../")) return undefined;
  return normalized;
}

function isInside(filePath, basePath) {
  const relative = path.relative(basePath, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".gif": "image/gif",
      ".html": "text/html; charset=utf-8",
      ".ico": "image/x-icon",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".txt": "text/plain; charset=utf-8",
      ".webp": "image/webp",
      ".xml": "application/xml; charset=utf-8",
    }[extension] || "application/octet-stream"
  );
}
