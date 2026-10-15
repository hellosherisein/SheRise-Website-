import { test, expect, type Page } from "@playwright/test";

const product = { id: "1", slug: "sherise-20-count-organic-sanitary-pads", name: "Live 20 count pads",
  shortDescription: "Current product details", description: "Current product", category: "Sanitary Pads", images: ["/test.png"],
  sizes: ["XL"], flow: ["MEDIUM"], stock: 25, mrp: 350, salePrice: 299, discount: 10, sku: "LIVE-20",
  packOptions: [{ label: "Total 20 Count", price: 299, mrp: 350, stock: 25 }], features: [], materials: [],
  usageInstructions: [], disposalInstructions: [], faq: [], relatedProducts: [] };

async function mockOtherApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session") await route.fulfill({ json: { user: null, addresses: [], wishlist: [], orders: [] } });
    else if (path === "/api/catalog/products") await route.fulfill({ json: { products: [product] } });
    else await route.fulfill({ json: { products: [], reviews: [], faqs: [], posts: [], coupons: [] } });
  });
}

test("slow product fetch keeps visible content and then displays the selected product", async ({ page }) => {
  await mockOtherApis(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/catalog/products?slug=**", async (route) => {
    expect(new URL(route.request().url()).searchParams.get("slug")).toBe(product.slug);
    await pending;
    await route.fulfill({ json: { products: [product] } });
  });
  await page.goto(`/products/${product.slug}`);
  await expect(page.getByText("Loading product details…", { exact: true })).toBeVisible();
  expect((await page.locator("main").boundingBox())!.height).toBeGreaterThan(400);
  release();
  await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
  await expect(page.getByRole("combobox")).toContainText("Total 20 Count");
  await expect(page.getByRole("button", { name: "ADD TO CART", exact: true })).toBeEnabled();
});

test("product request failure offers retry and recovers without showing a static product", async ({ page }) => {
  await mockOtherApis(page);
  let fails = true;
  await page.route("**/api/catalog/products?slug=**", async (route) => {
    await route.fulfill(fails ? { status: 503, json: { error: "Temporarily unavailable" } } : { json: { products: [product] } });
  });
  await page.goto(`/products/${product.slug}`);
  await expect(page.getByRole("heading", { name: "Could not load this page" })).toBeVisible();
  await expect(page.getByText("Product details could not be loaded. Please try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "ADD TO CART", exact: true })).toHaveCount(0);
  fails = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
});

test("missing live product does not fall back to an outdated static catalog entry", async ({ page }) => {
  await mockOtherApis(page);
  await page.route("**/api/catalog/products?slug=**", (route) => route.fulfill({ json: { products: [] } }));
  await page.goto(`/products/${product.slug}`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("a stalled product request times out into a recoverable error", async ({ page }) => {
  await mockOtherApis(page);
  await page.addInitScript(() => {
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = () => timeout(100);
  });
  await page.route("**/api/catalog/products?slug=**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ json: { products: [product] } }).catch(() => {});
  });
  await page.goto(`/products/${product.slug}`);
  await expect(page.getByRole("heading", { name: "Could not load this page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
});
