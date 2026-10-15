import { test, expect } from "@playwright/test";

test("signed-in checkout applies coupons without submitting and preserves the account after a server error", async ({ page }) => {
  const user = { id: "42", name: "Checkout Customer", email: "checkout@example.test", phone: "9876543210", whatsappNumber: "9876543210", createdAt: new Date().toISOString() };
  const address = { id: "123", name: user.name, phone: user.phone, line1: "12 Test Street", line2: "", city: "Pune", state: "Maharashtra", pin: "411001", label: "Home", isDefault: true };
  const account = { user, addresses: [address], wishlist: [], orders: [] as unknown[] };
  const cart = { slug: "session-test-pad", name: "Session test pads", quantity: 1, size: "XL", flow: "Medium", pack: "Pack of 8", price: 200 };
  let sessionFails = false;
  let orderRequests = 0;
  let lastOrder: Record<string, unknown> | undefined;
  await page.addInitScript(({ cart }) => {
    localStorage.setItem("sherise-cart-v2:42", JSON.stringify([cart]));
  }, { cart });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session") {
      await route.fulfill({ status: sessionFails ? 500 : 200, json: sessionFails ? { error: "Temporary server failure" } : account });
    } else if (path === "/api/catalog/coupons") {
      await route.fulfill({ json: { coupons: [{ code: "SAVE10", discountType: "PERCENTAGE", discountValue: 10 }] } });
    } else if (path === "/api/customer/order-create") {
      orderRequests++;
      lastOrder = route.request().postDataJSON();
      const order = { id: "SR-TEST", createdAt: new Date().toISOString(), items: [cart], address, subtotal: 200,
        discount: 20, shippingAmount: 40, donationAmount: 50, total: 270, payment: "UPI", status: "preview" };
      account.orders = [order];
      await route.fulfill({ status: 201, json: { order } });
    } else await route.fulfill({ json: { products: [], posts: [], faqs: [], reviews: [] } });
  });
  await page.goto("/checkout");
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue(address.line1);
  await expect(page.getByLabel("Choose a saved address")).toHaveValue("123");
  await page.getByRole("checkbox").check();
  const coupon = page.getByPlaceholder("Enter coupon manually");
  await coupon.fill("SAVE10");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("SAVE10 applied: 10% off.", { exact: true })).toBeVisible();
  await coupon.press("Enter");
  expect(orderRequests).toBe(0);
  expect(await page.locator("form form").count()).toBe(0);
  await page.locator('input[name="donationAmount"][value="50"]').check({ force: true });
  await expect(page.getByText("Donation", { exact: true })).toBeVisible();
  sessionFails = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: "PLACE ORDER", exact: true })).toBeVisible();
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue(address.line1);
  sessionFails = false;
  await page.getByRole("button", { name: "PLACE ORDER", exact: true }).click();
  await expect(page).toHaveURL(/order-success/);
  expect(orderRequests).toBe(1);
  expect(lastOrder?.["donationAmount"]).toBe(50);
  expect(lastOrder?.["coupon"]).toBe("SAVE10");
  expect((lastOrder?.["address"] as { id: string }).id).toBe("123");
  await expect(page.getByText("Your order is saved to your account.", { exact: false })).toBeVisible();
});
