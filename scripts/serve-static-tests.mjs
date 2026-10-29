// Test-only server: deliberately never imports application APIs, dotenv or database modules.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname.startsWith("/api/")) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Tests must mock API requests." }));
      return;
    }
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if (!(await stat(file)).isFile()) file = path.join(root, "index.html");
    } catch {
      file = path.join(root, "index.html");
    }
    const type =
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
      }[path.extname(file)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(await readFile(file));
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(8081, "127.0.0.1", () =>
  console.log("Safe static browser test server: http://127.0.0.1:8081"),
);
