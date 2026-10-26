import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("sherise-welcome-popup-seen", "true"));
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/customer/session") {
      return route.fulfill({ json: { user: null, addresses: [], orders: [], wishlist: [] } });
    }
    return route.fulfill({ json: { products: [], posts: [], faqs: [], reviews: [] } });
  });
});

async function expectSectionInView(page: Page, sectionId: string) {
  const section = page.locator(`#${sectionId}`);
  await expect(section).toBeInViewport();
  await expect.poll(async () => (await section.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(74);
  await expect.poll(async () => (await section.boundingBox())?.y ?? 1000).toBeLessThan(160);
  expect(new URL(page.url()).hash).toBe("");
}

for (const sectionId of ["product-features", "anion-strip", "foundation"]) {
  test(`${sectionId} has a clean direct URL that survives refresh`, async ({ page }) => {
    const response = await page.goto(`/why-sherise/${sectionId}`);
    expect(response?.status()).toBe(200);
    await expectSectionInView(page, sectionId);
    await page.reload();
    await expectSectionInView(page, sectionId);
  });

  test(`legacy ${sectionId} bookmark opens the clean URL and preserves queries`, async ({ page }) => {
    await page.goto(`/why-sherise/?utm_source=bookmark#${sectionId}`);
    await expect(page).toHaveURL(new RegExp(`/why-sherise/${sectionId}\\?utm_source=bookmark$`));
    await expectSectionInView(page, sectionId);
  });
}

test("desktop dropdown uses clean links and browser back/forward restores the section", async ({ page }) => {
  await page.goto("/why-sherise");
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  for (const [label, sectionId] of [["Product Features", "product-features"], ["Anion Strip", "anion-strip"]]) {
    await nav.getByRole("link", { name: "Why SheRise", exact: true }).hover();
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", `/why-sherise/${sectionId}`);
    await link.click();
    await expectSectionInView(page, sectionId!);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/why-sherise\/product-features$/);
  await expectSectionInView(page, "product-features");
  await page.goForward();
  await expect(page).toHaveURL(/\/why-sherise\/anion-strip$/);
  await expectSectionInView(page, "anion-strip");
});

test("mobile dropdown opens Product Features without a fragment", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/why-sherise");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const menu = page.getByRole("dialog");
  await menu.locator("summary").filter({ hasText: "Why SheRise" }).click();
  const link = menu.getByRole("link", { name: "Product Features", exact: true });
  await expect(link).toHaveAttribute("href", "/why-sherise/product-features");
  await link.click();
  await expect(page).toHaveURL(/\/why-sherise\/product-features$/);
  await expectSectionInView(page, "product-features");
});

test("unknown sections still show a missing page and other page fragments still work", async ({ page }) => {
  await page.goto("/why-sherise/nonexistent-section");
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await page.goto("/period-guide#wellness-tips");
  await expect(page.locator("#wellness-tips")).toBeInViewport();
  expect(new URL(page.url()).hash).toBe("#wellness-tips");
});
