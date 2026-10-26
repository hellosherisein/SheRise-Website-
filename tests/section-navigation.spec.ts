import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

const dropdowns = [
  {
    name: "Why SheRise", path: "/why-sherise",
    sections: [
      { label: "Product Features", id: "product-features" },
      { label: "Anion Strip", id: "anion-strip" },
      { label: "Foundation", id: "foundation" },
    ],
  },
  {
    name: "About", path: "/about",
    sections: [
      { label: "Meet our founder", id: "meet-the-founder" },
      { label: "The SheRise Vision", id: "vision" },
      { label: "SheRise Welfare Foundation", id: "sherise-welfare-foundation" },
    ],
  },
  {
    name: "Period Care", path: "/period-guide",
    sections: [
      { label: "Period Guide Overview", id: "period-guide-overview" },
      { label: "Wellness Tips", id: "wellness-tips" },
      { label: "Red Dot Disposal", id: "red-dot-method" },
      { label: "During Your Period", id: "during-period" },
      { label: "Mindful Self-Care", id: "mindful-self-care" },
    ],
  },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("sherise-welcome-popup-seen", "true"));
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
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
  // Scroll positions can round a 74px margin down to a fractional CSS pixel.
  await expect.poll(async () => (await section.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(73);
  await expect.poll(async () => (await section.boundingBox())?.y ?? 1000).toBeLessThan(160);
  expect(new URL(page.url()).hash).toBe("");
}

for (const dropdown of dropdowns) {
  for (const { id } of dropdown.sections) {
    test(`${dropdown.path}/${id} survives refresh and shows the selected section`, async ({ page }) => {
      const response = await page.goto(`${dropdown.path}/${id}`);
      expect(response?.status()).toBe(200);
      await expectSectionInView(page, id);
      await page.reload();
      await expectSectionInView(page, id);
    });

    test(`legacy ${dropdown.path}#${id} bookmark preserves queries on the clean URL`, async ({ page }) => {
      await page.goto(`${dropdown.path}/?utm_source=bookmark#${id}`);
      await expect(page).toHaveURL(new RegExp(`${dropdown.path}/${id}\\?utm_source=bookmark$`));
      await expectSectionInView(page, id);
    });
  }

  test(`${dropdown.name} desktop dropdown uses clean links and keeps the parent active`, async ({ page }) => {
    await page.goto(dropdown.path);
    const nav = page.getByRole("navigation", { name: "Primary", exact: true });
    const parent = nav.getByRole(dropdown.name === "Period Care" ? "button" : "link", {
      name: dropdown.name, exact: true,
    });
    await expect(nav.locator('a[href*="#"]')).toHaveCount(0);
    for (const { label, id } of dropdown.sections) {
      await parent.hover();
      const link = nav.getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("href", `${dropdown.path}/${id}`);
      await link.click();
      expect(new URL(page.url()).pathname).toBe(`${dropdown.path}/${id}`);
      await expectSectionInView(page, id);
      await expect(parent).toHaveClass(/text-brand-coral/);
    }
  });

  test(`${dropdown.name} mobile dropdown opens every section without a fragment`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(dropdown.path);
    for (const { label, id } of dropdown.sections) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      const menu = page.getByRole("dialog");
      await menu.locator("summary").filter({ hasText: dropdown.name }).click();
      await expect(menu.locator('a[href*="#"]')).toHaveCount(0);
      const link = menu.getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("href", `${dropdown.path}/${id}`);
      await link.click();
      expect(new URL(page.url()).pathname).toBe(`${dropdown.path}/${id}`);
      await expectSectionInView(page, id);
    }
  });
}

test("browser back/forward restores the selected section", async ({ page }) => {
  await page.goto("/why-sherise");
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  for (const [label, sectionId] of [["Product Features", "product-features"], ["Anion Strip", "anion-strip"]] as const) {
    await nav.getByRole("link", { name: "Why SheRise", exact: true }).hover();
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", `/why-sherise/${sectionId}`);
    await link.click();
    await expectSectionInView(page, sectionId);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/why-sherise\/product-features$/);
  await expectSectionInView(page, "product-features");
  await page.goForward();
  await expect(page).toHaveURL(/\/why-sherise\/anion-strip$/);
  await expectSectionInView(page, "anion-strip");
});

test("About page founder action uses the clean URL, including from a subsection", async ({ page }) => {
  await page.goto("/about/vision");
  const link = page.locator("main").getByRole("link", { name: "Meet our founder", exact: true });
  await expect(link).toHaveAttribute("href", "/about/meet-the-founder");
  await link.click();
  await expect(page).toHaveURL(/\/about\/meet-the-founder$/);
  await expectSectionInView(page, "meet-the-founder");
});

test("unknown sections still show a missing page and other page fragments still work", async ({ page }) => {
  for (const { path } of dropdowns) {
    await page.goto(`${path}/nonexistent-section`);
    await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  }
  await page.goto("/period-guide#wellness-essence");
  await expect(page.locator("#wellness-essence")).toBeInViewport();
  expect(new URL(page.url()).hash).toBe("#wellness-essence");
});

test("same-page legacy hash changes normalize encoded sections and preserve queries", async ({ page }) => {
  await page.goto("/about?utm_source=old-link");
  await page.evaluate(() => { window.location.hash = "%76ision"; });
  await expect(page).toHaveURL(/\/about\/vision\?utm_source=old-link$/);
  await expectSectionInView(page, "vision");
});

test("Period Care FAQs link still opens the FAQ page", async ({ page }) => {
  await page.goto("/period-guide");
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  await nav.getByRole("button", { name: "Period Care", exact: true }).hover();
  await nav.getByRole("link", { name: "FAQs", exact: true }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole("heading", { name: "SheRise - Frequently Asked Questions", exact: true })).toBeVisible();
});
