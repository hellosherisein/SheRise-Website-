import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page, price = 1200) {
  const user = {
    id: "42",
    name: "Shipping Customer",
    email: "test@example.test",
    phone: "9876543210",
  };
  const address = {
    id: "123",
    name: user.name,
    phone: user.phone,
    line1: "12 Test Street",
    line2: "",
    city: "Pune",
    state: "Maharashtra",
    pin: "411001",
    label: "Home",
    isDefault: true,
  };
  const item = {
    slug: "shipping-pads",
    name: "Pads",
    size: "XL",
    flow: "MEDIUM",
    pack: "Pack",
    quantity: 1,
    price,
  };
  let quotes = 0,
    orders = 0;
  const requests: Array<{ pin: string; payment: string }> = [];
  await page.addInitScript((item) => {
    localStorage.setItem("sherise-cart-v2:42", JSON.stringify([item]));
    sessionStorage.setItem("sherise-welcome-popup-seen", "true");
  }, item);
  await page.route("https://checkout.razorpay.com/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session")
      return route.fulfill({ json: { user, addresses: [address], orders: [], wishlist: [] } });
    if (path === "/api/catalog/products")
      return route.fulfill({
        json: {
          products: [
            {
              ...item,
              id: "1",
              images: [],
              stock: 50,
              sizes: ["XL"],
              flow: ["MEDIUM"],
              packOptions: [{ label: "Pack", price, mrp: price, stock: 50 }],
            },
          ],
        },
      });
    if (path === "/api/payments/config") return route.fulfill({ json: { enabled: true } });
    if (path === "/api/shipping/quote") {
      quotes++;
      const input = route.request().postDataJSON();
      requests.push(input);
      if (input.pin === "999999")
        return route.fulfill({
          status: 400,
          json: { error: "Delivery is unavailable for this PIN code." },
        });
      const shipping = input.pin === "400013" ? 85 : 65;
      const codFee = input.payment === "Cash on Delivery" ? 20 : 0;
      return route.fulfill({
        json: {
          quote: {
            id: "00000000-0000-4000-8000-000000000001",
            expiresAt: new Date(Date.now() + 300000).toISOString(),
            subtotal: price,
            discountAmount: 0,
            gstAmount: 0,
            shippingAmount: shipping,
            codFee,
            donationAmount: input.donationAmount,
            total: price + shipping + codFee + input.donationAmount,
            carrierCost: shipping,
            codAvailable: input.pin !== "400013",
            codMinimum: 1000,
            codMaximum: 20000,
          },
        },
      });
    }
    if (path.includes("create-order") || path.includes("order-create")) {
      orders++;
      return route.fulfill({
        status: 503,
        json: { error: "No real order is created by this test." },
      });
    }
    return route.fulfill({ json: { coupons: [], products: [], reviews: [], posts: [], faqs: [] } });
  });
  return { requests, counts: () => ({ quotes, orders }) };
}

test("online payment remains selectable for a COD-eligible order", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/checkout");
  await expect(page.getByLabel("Cash on Delivery", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("UPI", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("UPI", { exact: true })).toBeChecked();
  await page.getByLabel("Cash on Delivery", { exact: true }).check();
  await expect.poll(() => state.requests.at(-1)?.payment).toBe("Cash on Delivery");
  await expect(page.getByText("COD fee", { exact: true })).toBeVisible();
  await page.getByLabel("UPI", { exact: true }).check();
  await expect(page.getByLabel("UPI", { exact: true })).toBeChecked();
  expect(state.counts().orders).toBe(0);
});

test("changing PIN refreshes shipping and destination COD eligibility", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/checkout");
  await expect(page.getByLabel("Cash on Delivery", { exact: true })).toBeEnabled();
  await page.getByLabel("PIN code", { exact: true }).fill("400013");
  await expect.poll(() => state.requests.at(-1)?.pin).toBe("400013");
  await expect(page.getByLabel("Cash on Delivery", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeEnabled();
  await expect(page.getByText("₹85", { exact: true })).toBeVisible();
});

test("unsupported PIN blocks checkout without creating a payment or order", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/checkout");
  await page.getByLabel("PIN code", { exact: true }).fill("999999");
  await expect(
    page.getByText("Delivery is unavailable for this PIN code.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeDisabled();
  expect(state.counts().orders).toBe(0);
});

test("COD is unavailable at exactly 1000 and online payment remains available", async ({
  page,
}) => {
  await setup(page, 1000);
  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Cash on Delivery", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("UPI", { exact: true })).toBeEnabled();
});
