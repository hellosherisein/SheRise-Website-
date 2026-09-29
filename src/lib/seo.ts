export const siteUrl = (import.meta.env["VITE_SITE_URL"] || "https://sherise.example").replace(
  /\/$/,
  "",
);
export function seo(title: string, description: string, path = "/", privatePage = false) {
  const url = siteUrl + path;
  return {
    meta: [
      { title: `${title} | SheRise` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | SheRise` },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${title} | SheRise` },
      { name: "twitter:description", content: description },
      ...(privatePage || siteUrl.includes(".example")
        ? [{ name: "robots", content: "noindex,follow" }]
        : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
