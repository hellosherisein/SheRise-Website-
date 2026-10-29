import { expect, test } from "@playwright/test";

test("lead badge clears after viewing and only new records notify after reload", async ({
  page,
}) => {
  let ids = ["mysql:3", "mysql:2", "mysql:1"];
  await page.addInitScript(() => localStorage.setItem("sherise-admin-session", "active"));
  await page.route("**/api/admin/*", async (route) => {
    const isLeads = new URL(route.request().url()).pathname.endsWith("/popup-leads");
    await route.fulfill({
      json: {
        title: isLeads ? "Pop-up Leads" : "Admin module",
        action: "Add",
        columns: [
          "Name",
          "Mobile",
          "Email",
          "Interested In",
          "Message",
          "Date",
          "Source",
          "Status",
        ],
        rows: isLeads
          ? ids.map((id) => [
              id,
              "9876543210",
              "visitor@example.test",
              "Pads",
              "Enquiry message",
              "2026-10-19",
              "Website popup",
              "NEW",
            ])
          : [],
        notificationIds: isLeads ? ids : [],
        metrics: [],
        source: "mysql",
      },
    });
  });

  await page.goto("/admin/banners");
  const leadsLink = page.getByRole("link", { name: /Pop-up Leads/ });
  await expect(leadsLink.getByText("3", { exact: true })).toBeVisible();
  await leadsLink.click();
  await expect(page.getByRole("cell", { name: "mysql:3", exact: true })).toBeVisible();
  await expect(leadsLink).toHaveText("Pop-up Leads");

  await page.reload();
  await expect(page.getByRole("cell", { name: "mysql:3", exact: true })).toBeVisible();
  await expect(leadsLink).toHaveText("Pop-up Leads");
  await page.getByRole("link", { name: "Banners", exact: true }).click();
  // Replacing a deleted record keeps the total unchanged, but still creates one unread lead.
  ids = ["mysql:4", "mysql:2", "mysql:1"];
  await page.reload();
  await expect(leadsLink.getByText("1", { exact: true })).toBeVisible();
  await leadsLink.click();
  await expect(page.getByRole("cell", { name: "mysql:4", exact: true })).toBeVisible();
  await expect(leadsLink).toHaveText("Pop-up Leads");
});

test("a failed lead page load does not mark notifications seen", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sherise-admin-session", "active"));
  await page.route("**/api/admin/*", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/popup-leads")) {
      await route.fulfill({ status: 500, json: { error: "Lead list unavailable" } });
      return;
    }
    await route.fulfill({
      json: { title: "Admin", action: "Add", columns: [], rows: [], metrics: [], source: "mysql" },
    });
  });
  await page.goto("/admin/popup-leads");
  await expect(page.getByText("Lead list unavailable", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sherise-admin-seen-leads"))).toBeNull();
});
