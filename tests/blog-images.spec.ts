import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const image = readFileSync("src/assets/sherise-flatlay.jpg");
const imageUrl = "/api/content/blog-image?id=4f6500ea-6465-4f95-9654-678ad5a5aa92";

test("blog image previews immediately, blocks saving during upload and persists after save", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sherise-admin-session", "active"));
  const config = { title: "Blogs", action: "Add Blog", columns: ["Title", "Slug", "Category", "Published", "Author", "Image", "Excerpt", "Content", "SEO Title", "SEO Description", "Keywords", "Status"], rows: [] as string[][], metrics: [], source: "mysql" };
  let saves = 0, releaseUpload: (() => Promise<void>) | undefined;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/admin/upload-blog-image") { releaseUpload = () => route.fulfill({ json: { urls: [imageUrl] } }); return; }
    if (path === "/api/content/blog-image") return route.fulfill({ contentType: "image/jpeg", body: image });
    if (path === "/api/admin/blogs") {
      if (route.request().method() === "POST") {
        saves++;
        const data = route.request().postDataJSON();
        expect(data.imageUrl).toBe(imageUrl);
        config.rows = [[data.title, "test-blog", "Period Care", "", "SheRise Team", data.imageUrl, "", "", "", "", "", "DRAFT"]];
      }
      return route.fulfill({ json: config });
    }
    if (path === "/api/customer/session") return route.fulfill({ json: { user: null, addresses: [], orders: [], wishlist: [] } });
    return route.fulfill({ json: { rows: [], metrics: [], products: [] } });
  });
  await page.goto("/admin/blogs");
  await page.getByRole("button", { name: /Add Blog|Add New/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Blog Title", exact: true }).fill("Test blog");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "blog.jpg", mimeType: "image/jpeg", buffer: image });
  await expect(dialog.getByAltText("Blog preview", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(dialog).toContainText("blog.jpg");
  await expect(dialog).toContainText("Uploading blog image");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect(saves).toBe(0);
  await expect.poll(() => Boolean(releaseUpload)).toBe(true);
  await releaseUpload!();
  await expect(dialog.locator('input[name="imageUrl"]')).toHaveValue(imageUrl);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(saves).toBe(1);
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await expect(page.getByAltText("Blog preview", { exact: true })).toHaveAttribute("src", imageUrl);
});

test("blog upload failure remains visible and cannot silently save a missing image", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sherise-admin-session", "active"));
  let saves = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/admin/upload-blog-image") return route.fulfill({ status: 503, body: "Unavailable" });
    if (path === "/api/admin/blogs") {
      if (route.request().method() === "POST") saves++;
      return route.fulfill({ json: { title: "Blogs", action: "Add Blog", columns: ["Title", "Status"], rows: [], metrics: [], source: "mysql" } });
    }
    if (path === "/api/customer/session") return route.fulfill({ json: { user: null, addresses: [], orders: [], wishlist: [] } });
    return route.fulfill({ json: { rows: [], metrics: [], products: [] } });
  });
  await page.goto("/admin/blogs");
  await page.getByRole("button", { name: /Add Blog|Add New/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Blog Title", exact: true }).fill("Test blog");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "blog.jpg", mimeType: "image/jpeg", buffer: image });
  await expect(dialog.getByRole("alert")).toContainText("Image upload service is unavailable");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect(saves).toBe(0);
  await expect(dialog).toBeVisible();
});
