import { test, expect, type Page, type Route } from "@playwright/test";

const product = {
  id: "901",
  slug: "live-quick-view-pads",
  name: "Live quick view pads",
  shortDescription: "Current catalog product",
  description: "Current catalog product",
  category: "Sanitary Pads",
  images: [],
  sizes: ["XL"],
  flow: ["Medium"],
  packOptions: [{ label: "Pack of 8", price: 200, mrp: 220, stock: 12 }],
  mrp: 220,
  salePrice: 200,
  discount: 9,
  stock: 12,
  sku: "TEST",
  features: [],
  materials: [],
  usageInstructions: [],
  disposalInstructions: [],
  faq: [],
  relatedProducts: [],
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

test("slow image download does not block adding an available product", async ({ page }) => {
  await setup(page);
  const pendingImages: Route[] = [];
  await page.route("**/api/catalog/product-image?*", (route) => {
    pendingImages.push(route);
  });
  await page.route("**/api/catalog/products?*", (route) =>
    route.fulfill({
      json: { products: [{ ...product, images: ["/api/catalog/product-image?id=123"] }] },
    }),
  );
  try {
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Quick view", exact: true }).click();
    const add = page.getByRole("button", { name: "Add to cart", exact: true });
    await expect(add).toBeEnabled();
    await add.click();
    await expect(page.getByRole("heading", { name: "Your bag", exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("sherise-cart-v2:guest") || "[]")),
      )
      .toMatchObject([{ slug: product.slug, quantity: 1 }]);
  } finally {
    await Promise.all(pendingImages.map((route) => route.abort().catch(() => {})));
  }
});

test("failed catalog can retry; quick view adds the live product to the bag", async ({ page }) => {
  await setup(page);
  let requests = 0;
  await page.route("**/api/catalog/products?*", async (route) => {
    requests++;
    return requests <= 3
      ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: { products: [product] } });
  });
  await page.goto("/category/sanitary-pads");
  await expect(page.getByRole("alert")).toContainText("Could not check current products");
  await expect(page.getByRole("button", { name: "Quick view", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Retry loading products" }).click();
  await page.getByRole("button", { name: "Quick view", exact: true }).click();
  const add = page.getByRole("button", { name: "Add to cart", exact: true });
  await expect(add).toBeEnabled();
  expect(requests).toBe(4);
  await add.click();
  await expect(page.getByRole("heading", { name: "Your bag", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("sherise-cart-v2:guest") || "[]")),
    )
    .toMatchObject([
      { slug: product.slug, quantity: 1, size: "XL", pack: "Pack of 8", price: 200 },
    ]);
});

test("temporary catalog failure recovers automatically", async ({ page }) => {
  await setup(page);
  let attempts = 0;
  await page.route("**/api/catalog/products?*", (route) =>
    ++attempts === 1
      ? route.fulfill({ status: 503, body: "Temporarily unavailable" })
      : route.fulfill({ json: { products: [product] } }),
  );
  await page.goto("/shop");
  await expect(page.getByRole("button", { name: "Quick view", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("out of stock quick view explains why adding is disabled", async ({ page }) => {
  await setup(page);
  await page.route("**/api/catalog/products?*", (route) =>
    route.fulfill({ json: { products: [{ ...product, stock: 0 }] } }),
  );
  await page.goto("/category/sanitary-pads");
  await page.getByRole("button", { name: "Quick view", exact: true }).click();
  await expect(page.getByRole("button", { name: "Out of stock", exact: true })).toBeDisabled();
  await expect(page.getByText("This product is out of stock.", { exact: true })).toBeVisible();
});

test("empty live catalog never shows demo products", async ({ page }) => {
  await setup(page);
  await page.route("**/api/catalog/products?*", (route) =>
    route.fulfill({ json: { products: [] } }),
  );
  await page.goto("/category/sanitary-pads");
  await expect(page.getByText("No matches just yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick view", exact: true })).toHaveCount(0);
});

for (const flow of ["Light", "Medium", "Heavy", "Overnight"]) {
  test(`${flow} homepage card finds products with admin uppercase flow values`, async ({
    page,
  }) => {
    await setup(page);
    const matching = { ...product, flow: [" " + flow.toUpperCase() + " "] };
    const other = {
      ...product,
      id: "902",
      slug: "other-flow-pads",
      name: "Other flow pads",
      flow: ["UNSELECTED"],
    };
    await page.route("**/api/catalog/products?*", (route) =>
      route.fulfill({ json: { products: [matching, other] } }),
    );
    await page.goto("/");
    await page.getByRole("link", { name: `Shop ${flow} flow products`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/shop\\?flow=${flow}$`));
    await expect(page.getByRole("combobox", { name: "Flow", exact: true })).toHaveValue(flow);
    const cards = page
      .getByRole("article")
      .filter({ has: page.getByRole("button", { name: "Quick view", exact: true }) });
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText(product.name);
    await expect(cards).not.toContainText(other.name);
  });
}

test("shop reflects changed admin multi-flow assignments on reload", async ({ page }) => {
  await setup(page);
  let assignedFlows = ["HEAVY", "OVERNIGHT"];
  await page.route("**/api/catalog/products?*", (route) =>
    route.fulfill({ json: { products: [{ ...product, flow: assignedFlows }] } }),
  );
  await page.goto("/shop?flow=overnight");
  await expect(page.getByRole("combobox", { name: "Flow", exact: true })).toHaveValue("Overnight");
  await expect(page.getByRole("button", { name: "Quick view", exact: true })).toHaveCount(1);
  assignedFlows = ["LIGHT"];
  await page.reload();
  await expect(page.getByText("No matches just yet", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Flow", exact: true }).selectOption("Light");
  await expect(page.getByRole("button", { name: "Quick view", exact: true })).toHaveCount(1);
});
