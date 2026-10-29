import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, created = false) {
  let actions = 0;
  const config = {
    codMinimum: 1000,
    codMaximum: 20000,
    pickupPin: "400013",
    pickupName: "Seller",
    pickupPhone: "9876543210",
    pickupAddress: "12 Warehouse Road",
    pickupCity: "Mumbai",
    pickupState: "Maharashtra",
    sellerName: "Seller legal name",
    sellerAddress: "12 Billing Road",
    sellerGstTin: "",
    sellerTaxStatus: "UNREGISTERED",
    categoryOfGoods: "Sanitary pads",
    freeShippingThreshold: 499,
    shippingPolicy: "FREE_THRESHOLD",
    pricingPlan: "Seller-confirmed Flat",
    pricingConfirmed: true,
    courierGroup: "CONFIRMED",
    serviceType: "SURFACE",
    packages: [],
  };
  await page.addInitScript(() => localStorage.setItem("sherise-admin-session", "active"));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session")
      return route.fulfill({ json: { user: null, addresses: [], orders: [], wishlist: [] } });
    if (path === "/api/admin/shipping-connection")
      return route.fulfill({
        json: {
          credentialsConfigured: true,
          liveEnabled: false,
          connection: {
            status: "authentication-failed",
            carrierStatus: 401,
            checkedAt: "2026-10-29T00:00:00Z",
          },
        },
      });
    if (path === "/api/admin/shipping-settings")
      return route.fulfill({
        json: {
          title: "Shipping Settings",
          action: "Save Settings",
          columns: ["Setting", "Value"],
          rows: [],
          metrics: [],
          source: "mysql",
          config,
        },
      });
    if (path === "/api/admin/shipping-orders") {
      if (route.request().method() === "POST") {
        actions++;
        return route.fulfill({ json: { saved: true } });
      }
      return route.fulfill({
        json: {
          adapterReady: true,
          credentialsConfigured: true,
          liveEnabled: false,
          shipment: {
            status: created ? "CREATED" : "BLOCKED",
            shipment_id: created ? "EKART-1" : null,
            awb: created ? "AWB-1" : null,
            payment_method: "RAZORPAY",
            shipping_amount: 0,
            cod_amount: 0,
            cod_settlement_status: "NOT_APPLICABLE",
          },
          events: [{ status: "In transit", occurred_at: "2026-10-28T12:00:00Z" }],
        },
      });
    }
    if (path === "/api/admin/shipping-label")
      return route.fulfill({
        status: 502,
        json: { error: "Shipping label unavailable from Ekart. Please retry." },
      });
    return route.fulfill({
      json: {
        title: "Orders",
        action: "Create Order",
        columns: ["Order", "Customer", "Products", "Amount", "Payment", "Status", "Payment Status"],
        rows:
          path === "/api/admin/orders"
            ? [["SR-1001", "Customer", "Pads", "Rs.1100", "RAZORPAY", "NEW", "SUCCESS"]]
            : [],
        metrics: [],
        source: "mysql",
        coupons: [],
        products: [],
        reviews: [],
        posts: [],
        faqs: [],
      },
    });
  });
  return { count: () => actions };
}

test("admin cannot create a shipment while live shipping is disabled", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/admin/orders");
  await page.getByRole("cell", { name: "SR-1001", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create / retry shipment", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Live shipment creation is disabled.", { exact: false }),
  ).toBeVisible();
  expect(state.count()).toBe(0);
});

test("existing shipment can sync tracking and label failures stay visible in the admin dialog", async ({
  page,
}) => {
  const state = await setup(page, true);
  await page.goto("/admin/orders");
  await page.getByRole("cell", { name: "SR-1001", exact: true }).click();
  await page.getByRole("button", { name: "Sync tracking", exact: true }).click();
  await expect.poll(() => state.count()).toBe(1);
  await page.getByRole("button", { name: "Download shipping label", exact: true }).click();
  await expect(
    page.getByText("Shipping label unavailable from Ekart. Please retry.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("shipping settings expose confirmed account pricing and seller configuration", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/admin/shipping-settings");
  await expect(
    page.getByLabel("Exact courier group returned by Ekart", { exact: true }),
  ).toHaveValue("CONFIRMED");
  await expect(page.getByLabel("Seller legal name", { exact: true })).toHaveValue(
    "Seller legal name",
  );
  await expect(page.getByRole("checkbox", { name: /I confirmed this pricing plan/ })).toBeChecked();
  await page.getByRole("button", { name: "Check Ekart API connection" }).click();
  await expect(
    page.getByText(/Ekart API: authentication-failed \(HTTP 401\). Live shipments: disabled/),
  ).toBeVisible();
});
