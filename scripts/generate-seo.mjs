import fs from "node:fs";
const origin = (process.env.VITE_SITE_URL || "https://sherise.example").replace(/\/$/, "");
const catalog = fs.readFileSync("src/lib/catalog.ts", "utf8");
const slugs = [...catalog.matchAll(/slug:\s*"([^"]+)"/g)].map((x) => x[1]);
const paths = [
  "/",
  "/shop",
  "/category/sanitary-pads",
  "/about",
  "/why-sherise",
  "/period-guide",
  "/blog",
  "/contact",
  "/faq",
  "/privacy-policy",
  "/terms",
  "/shipping-policy",
  "/return-refund-policy",
  ...slugs.map((s) => (s.startsWith("sherise-") ? "/products/" : "/blog/") + s),
];
fs.writeFileSync(
  "public/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join("\n") +
    "\n</urlset>\n",
);
fs.writeFileSync(
  "public/robots.txt",
  `User-agent: *\n${origin.includes(".example") ? "Disallow: /" : "Allow: /\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nDisallow: /order-success\nDisallow: /search"}\nSitemap: ${origin}/sitemap.xml\n`,
);
console.log(`Generated sitemap for ${paths.length} public pages.`);
