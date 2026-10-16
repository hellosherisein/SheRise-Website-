import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Simulated widget only: these browser checks never open a real gateway or charge money.
async function mockPayments(page: Page, account: { orders: unknown[] }) {
  await page.addInitScript(() => {
    (window as any).Razorpay = class {
      constructor(private options: any) {}
      open() { this.options.handler({ razorpay_order_id: "order_BROWSER", razorpay_payment_id: "pay_BROWSER", razorpay_signature: "0".repeat(64) }); }
      close() {}
      on() {}
    };
  });
  await page.route("**/api/payments/*", async (route) => {
    const action = new URL(route.request().url()).pathname.split("/").at(-1);
    if (action === "create-order") return route.fallback();
    if (action === "config") return route.fulfill({ json: { enabled: true } });
    const order = account.orders[0] as any;
    if (action === "verify") Object.assign(order, { payment: "RAZORPAY", paymentStatus: "SUCCESS", gatewayPaymentId: "pay_BROWSER" });
    return route.fulfill({ json: { confirmed: order?.paymentStatus === "SUCCESS", orderId: order?.id, state: order?.paymentStatus === "SUCCESS" ? "captured" : "created", amount: order?.total, paymentId: "pay_BROWSER" } });
  });
}

test("coupon requires a ₹600 subtotal and is removed when quantity drops below the minimum", async ({ page }) => {
  const cart = { slug: "minimum-test-pad", name: "Minimum test pads", quantity: 1, size: "XL", flow: "Medium", pack: "Pack of 8", price: 200 };
  await page.addInitScript(({ cart }) => {
    localStorage.setItem("sherise-cart-v2:guest", JSON.stringify([cart]));
    sessionStorage.setItem("sherise-welcome-popup-seen", "true");
  }, { cart });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session") return route.fulfill({ json: { user: null, orders: [], addresses: [], wishlist: [] } });
    if (path === "/api/catalog/products") return route.fulfill({ json: { products: [{ id: "1", ...cart, images: [], sizes: ["XL"], flow: ["Medium"], stock: 20, packOptions: [{ label: cart.pack, price: 200, mrp: 220, stock: 20 }] }] } });
    if (path === "/api/catalog/coupons") return route.fulfill({ json: { coupons: [{ code: "SHERISE11", discountType: "PERCENTAGE", discountValue: 10, minimumOrderAmount: 600 }] } });
    return route.fulfill({ json: { products: [], reviews: [] } });
  });
  await page.goto("/cart");
  const coupon = page.getByRole("button", { name: /SHERISE11/ });
  const discount = page.getByText("Discount", { exact: true }).locator("..");
  await coupon.click();
  await expect(page.getByRole("alert")).toHaveText("Minimum order ₹600 required.");
  await expect(page.getByRole("alert")).toHaveClass(/text-red-700/);
  await expect(discount).toContainText("-₹0");
  await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await expect(coupon).toContainText("Eligible");
  await coupon.click();
  await expect(coupon).toContainText("Applied");
  await expect(discount).toContainText("-₹60");
  await page.getByRole("button", { name: "Decrease quantity", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Minimum order ₹600 required.");
  await expect(discount).toContainText("-₹0");
});

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
    } else if (path === "/api/catalog/products") {
      await route.fulfill({ json: { products: [{ id: "1", slug: cart.slug, name: cart.name, images: [], sizes: ["XL"], flow: ["Medium"],
        stock: 20, packOptions: [{ label: "Pack of 8", price: 200, mrp: 220, stock: 20 }] }] } });
    } else if (path === "/api/catalog/coupons") {
      await route.fulfill({ json: { coupons: [{ code: "SAVE10", discountType: "PERCENTAGE", discountValue: 10 }, { code: "SHERISE11", discountType: "PERCENTAGE", discountValue: 10, minimumOrderAmount: 600 }] } });
    } else if (path === "/api/payments/create-order") {
      orderRequests++;
      lastOrder = route.request().postDataJSON();
      const order = { id: "SR-TEST", createdAt: new Date().toISOString(), items: [cart], address, subtotal: 200,
        discount: 20, shippingAmount: 40, donationAmount: 50, total: 270, payment: "UPI", status: "preview" };
      account.orders = [order];
      await route.fulfill({ json: { keyId: "rzp_test_BROWSER", razorpayOrderId: "order_BROWSER", orderId: order.id, amount: 27000, currency: "INR", prefill: user } });
    } else await route.fulfill({ json: { products: [], posts: [], faqs: [], reviews: [] } });
  });
  await mockPayments(page, account);
  await page.goto("/checkout");
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue(address.line1);
  await expect(page.getByLabel("Choose a saved address")).toHaveValue("123");
  await page.getByRole("checkbox").check();
  const minimumCoupon = page.getByRole("button", { name: /SHERISE11/ });
  await expect(minimumCoupon).toContainText("Minimum ₹600");
  await expect(minimumCoupon).not.toContainText("Active now");
  await minimumCoupon.click();
  const minimumError = page.getByRole("alert").filter({ hasText: "Minimum order ₹600 required." });
  await expect(minimumError).toHaveText("Minimum order ₹600 required.");
  await expect(minimumError).toHaveClass(/text-red-700/);
  expect(orderRequests).toBe(0);
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
  await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeVisible();
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue(address.line1);
  sessionFails = false;
  await page.getByRole("button", { name: "PAY NOW", exact: true }).click();
  await expect(page).toHaveURL(/order-success/);
  expect(orderRequests).toBe(1);
  expect(lastOrder?.["donationAmount"]).toBe(50);
  expect(lastOrder?.["coupon"]).toBe("SAVE10");
  expect((lastOrder?.["address"] as { id: string }).id).toBe("123");
  await expect(page.getByText("Payment confirmed.", { exact: false })).toBeVisible();
});

test("checkout lets an old bag choose a current pack before placing an order", async ({ page }) => {
  const user = { id: "42", name: "Checkout Customer", email: "checkout@example.test", phone: "9876543210" };
  const address = { id: "123", name: user.name, phone: user.phone, line1: "12 Test Street", line2: "", city: "Pune", state: "Maharashtra", pin: "411001", label: "Home", isDefault: true };
  const oldItem = { slug: "test-pads", name: "Test pads", quantity: 1, size: "XL", flow: "Medium", pack: "Old pack", price: 100 };
  let submitted: Record<string, unknown> | undefined;
  const account = { user, addresses: [address], wishlist: [], orders: [] as unknown[] };
  await page.addInitScript((item) => localStorage.setItem("sherise-cart-v2:42", JSON.stringify([item])), oldItem);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session") await route.fulfill({ json: account });
    else if (path === "/api/catalog/products") await route.fulfill({ json: { products: [{
      id: "1", slug: oldItem.slug, name: oldItem.name, images: [], sizes: ["XL"], flow: ["MEDIUM"], stock: 10,
      packOptions: [{ label: "Total 20 Count", price: 300, mrp: 350, stock: 10 }],
    }] } });
    else if (path === "/api/payments/create-order") {
      submitted = route.request().postDataJSON();
      const order = { id: "SR-FIXED", createdAt: new Date().toISOString(), address, items: submitted?.["items"], subtotal: 300, discount: 0, shippingAmount: 40, total: 340, payment: "UPI", status: "preview" };
      account.orders = [order];
      await route.fulfill({ json: { keyId: "rzp_test_BROWSER", razorpayOrderId: "order_BROWSER", orderId: order.id, amount: 34000, currency: "INR", prefill: user } });
    } else await route.fulfill({ json: { coupons: [], products: [], reviews: [], posts: [], faqs: [] } });
  });
  await mockPayments(page, account);
  await page.goto("/checkout");
  await expect(page.getByRole("region", { name: "Review bag options" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeDisabled();
  await page.getByLabel("Test pads pack", { exact: true }).selectOption("Total 20 Count");
  await expect(page.getByRole("region", { name: "Review bag options" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeEnabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "PAY NOW", exact: true }).click();
  await expect(page).toHaveURL(/order-success/);
  const item = (submitted?.["items"] as Array<{ pack: string; flow: string; price: number }>)[0]!;
  expect(item.pack).toBe("Total 20 Count");
  expect(item.flow).toBe("MEDIUM");
  expect(item.price).toBe(300);
});

test("homepage adds the live product options instead of the old static pack", async ({ page }) => {
  const product = { id: "1", slug: "sherise-20-count-organic-sanitary-pads", name: "Live 20 count pads",
    shortDescription: "Current product", description: "Current product", category: "Sanitary Pads", images: [],
    sizes: ["XL"], flow: ["MEDIUM"], stock: 25, mrp: 350, salePrice: 299, discount: 10, sku: "LIVE-20",
    packOptions: [{ label: "Total 20 Count", price: 299, mrp: 350, stock: 25 }], features: [], materials: [],
    usageInstructions: [], disposalInstructions: [], faq: [], relatedProducts: [] };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session") await route.fulfill({ json: { user: null, addresses: [], wishlist: [], orders: [] } });
    else if (path === "/api/catalog/products") await route.fulfill({ json: { products: [product] } });
    else await route.fulfill({ json: { reviews: [], products: [], coupons: [], posts: [], faqs: [] } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Add Live 20 count pads to cart", exact: true }).click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("sherise-cart-v2:guest") || "[]"))).toMatchObject([
    { slug: product.slug, pack: "Total 20 Count", size: "XL", flow: "MEDIUM", price: 299 },
  ]);
});
