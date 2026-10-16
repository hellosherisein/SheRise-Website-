import { test, expect, type Page } from "@playwright/test";

const product = {
  id: "901", slug: "live-quick-view-pads", name: "Live quick view pads",
  shortDescription: "Current catalog product", description: "Current catalog product",
  category: "Sanitary Pads", images: [], sizes: ["XL"], flow: ["Medium"],
  packOptions: [{ label: "Pack of 8", price: 200, mrp: 220, stock: 12 }],
  mrp: 220, salePrice: 200, discount: 9, stock: 12, sku: "TEST",
  features: [], materials: [], usageInstructions: [], disposalInstructions: [], faq: [], relatedProducts: [],
};

async function setup(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("sherise-welcome-popup-seen", "true"));
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/customer/session") {
      return route.fulfill({ json: { user: null, addresses: [], orders: [], wishlist: [] } });
    }
    return route.fulfill({ json: { products: [], posts: [], faqs: [], reviews: [] } });
  });
}

test("failed catalog can retry; quick view adds the live product to the bag", async ({ page }) => {
  await setup(page);
  let requests = 0;
  await page.route("**/api/catalog/products?*", async (route) => {
    requests++;
    return requests === 1 ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: { products: [product] } });
  });
  await page.goto("/category/sanitary-pads");
  await expect(page.getByRole("alert")).toContainText("Could not check current products");
  await expect(page.getByRole("button", { name: "Quick view", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Retry loading products" }).click();
  await page.getByRole("button", { name: "Quick view", exact: true }).click();
  const add = page.getByRole("button", { name: "Add to cart", exact: true });
  await expect(add).toBeEnabled();
  expect(requests).toBe(2);
  await add.click();
  await expect(page.getByRole("heading", { name: "Your bag", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sherise-cart-v2:guest") || "[]")))
    .toMatchObject([{ slug: product.slug, quantity: 1, size: "XL", pack: "Pack of 8", price: 200 }]);
});

test("out of stock quick view explains why adding is disabled", async ({ page }) => {
  await setup(page);
  await page.route("**/api/catalog/products?*", (route) => route.fulfill({ json: { products: [{ ...product, stock: 0 }] } }));
  await page.goto("/category/sanitary-pads");
  await page.getByRole("button", { name: "Quick view", exact: true }).click();
  await expect(page.getByRole("button", { name: "Out of stock", exact: true })).toBeDisabled();
  await expect(page.getByText("This product is out of stock.", { exact: true })).toBeVisible();
});

test("empty live catalog never shows demo products", async ({ page }) => {
  await setup(page);
  await page.route("**/api/catalog/products?*", (route) => route.fulfill({ json: { products: [] } }));
  await page.goto("/category/sanitary-pads");
  await expect(page.getByText("No matches just yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick view", exact: true })).toHaveCount(0);
});
