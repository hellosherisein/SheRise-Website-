import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page, mode: "success" | "dismiss" = "success") {
  const user = {
    id: "42",
    name: "Payment Customer",
    email: "payment@example.test",
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
    slug: "payment-pads",
    name: "Payment pads",
    quantity: 1,
    size: "XL",
    flow: "MEDIUM",
    pack: "Pack of 8",
    price: 300,
  };
  const account = {
    user,
    addresses: [address],
    wishlist: [],
    orders: [] as Array<{
      id: string;
      total: number;
      paymentStatus?: string;
      [key: string]: unknown;
    }>,
  };
  let creates = 0,
    verifies = 0,
    enabled = true;
  const requestIds: string[] = [];
  await page.addInitScript(
    ({ item, mode }) => {
      if (!sessionStorage.getItem("payment-test-seeded")) {
        localStorage.setItem("sherise-cart-v2:42", JSON.stringify([item]));
        sessionStorage.setItem("payment-test-seeded", "true");
      }
      sessionStorage.setItem("sherise-welcome-popup-seen", "true");
      (window as Window & { paymentTestMode: string }).paymentTestMode = mode;
      Object.assign(window, {
        Razorpay: class {
          constructor(
            private options: {
              handler: (response: Record<string, string>) => void;
              modal: { ondismiss: () => void };
            },
          ) {}
          open() {
            if ((window as Window & { paymentTestMode: string }).paymentTestMode === "dismiss")
              this.options.modal.ondismiss();
            else
              this.options.handler({
                razorpay_order_id: "order_BROWSER",
                razorpay_payment_id: "pay_BROWSER",
                razorpay_signature: "0".repeat(64),
              });
          }
          close() {}
          on() {}
        },
      });
    },
    { item, mode },
  );
  await page.route("https://checkout.razorpay.com/**", () => {
    throw new Error("Browser tests must not use a real gateway.");
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/shipping/quote") {
      const input = route.request().postDataJSON();
      const subtotal =
        300 * input.items.reduce((n: number, i: { quantity: number }) => n + i.quantity, 0);
      return route.fulfill({
        json: {
          quote: {
            id: "00000000-0000-4000-8000-000000000001",
            expiresAt: new Date(Date.now() + 300000).toISOString(),
            subtotal,
            discountAmount: 0,
            gstAmount: 0,
            shippingAmount: subtotal >= 499 ? 0 : 40,
            codFee: 0,
            donationAmount: input.donationAmount,
            total: subtotal + (subtotal >= 499 ? 0 : 40) + input.donationAmount,
            codAvailable: true,
            codMinimum: 1000,
            codMaximum: 20000,
          },
        },
      });
    }
    if (path === "/api/customer/session") return route.fulfill({ json: account });
    if (path === "/api/catalog/products")
      return route.fulfill({
        json: {
          products: [
            {
              ...item,
              id: "1",
              images: [],
              sizes: ["XL"],
              flow: ["MEDIUM"],
              stock: 20,
              packOptions: [{ label: "Pack of 8", price: 300, mrp: 350, stock: 20 }],
            },
          ],
        },
      });
    if (path === "/api/payments/config") return route.fulfill({ json: { enabled } });
    if (path === "/api/payments/create-order") {
      creates++;
      const input = route.request().postDataJSON();
      if (input.requestId) requestIds.push(input.requestId);
      if (!account.orders.length)
        account.orders = [
          {
            id: "SR-BROWSER",
            createdAt: new Date().toISOString(),
            address,
            items: [item],
            subtotal: 300,
            total: 340,
            discount: 0,
            payment: "RAZORPAY",
            paymentStatus: "PENDING",
            status: "preview",
          },
        ];
      return route.fulfill({
        json: {
          keyId: "rzp_test_BROWSER",
          razorpayOrderId: "order_BROWSER",
          orderId: "SR-BROWSER",
          amount: 34000,
          currency: "INR",
          confirmed: false,
          prefill: user,
        },
      });
    }
    if (path === "/api/payments/verify") {
      verifies++;
      Object.assign(account.orders[0], {
        paymentStatus: "SUCCESS",
        gatewayPaymentId: "pay_BROWSER",
        paidAt: new Date().toISOString(),
      });
      return route.fulfill({
        json: {
          confirmed: true,
          orderId: "SR-BROWSER",
          state: "captured",
          paymentId: "pay_BROWSER",
          amount: 340,
        },
      });
    }
    if (path === "/api/payments/status")
      return route.fulfill({
        json: { confirmed: false, state: "created", orderId: "SR-BROWSER", amount: 340 },
      });
    return route.fulfill({ json: { coupons: [], products: [], reviews: [], posts: [], faqs: [] } });
  });
  return {
    account,
    address,
    item,
    requestIds,
    counts: () => ({ creates, verifies }),
    disable: () => {
      enabled = false;
    },
  };
}

for (const width of [390, 1440]) {
  test(`verified online checkout clears the cart and shows payment ID at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page);
    await page.goto("/checkout");
    await page.getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeEnabled();
    // Two submissions in the same task must still open just one checkout.
    await page.getByRole("button", { name: "PAY NOW", exact: true }).evaluate((button) => {
      const form = (button as HTMLButtonElement).form!;
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(page).toHaveURL(/order-success/);
    await expect(page.getByText("Payment confirmed.", { exact: false })).toBeVisible();
    await expect(page.getByText("pay_BROWSER", { exact: true })).toBeVisible();
    expect(state.counts()).toEqual({ creates: 1, verifies: 1 });
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("sherise-cart-v2:42") || "[]")),
    ).toHaveLength(0);
  });
}

test("dismissed mobile checkout preserves the bag and can retry the existing order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, "dismiss");
  await page.goto("/checkout");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "PAY NOW", exact: true }).click();
  await expect(page).toHaveURL(/payment-failed/);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("sherise-cart-v2:42") || "[]")),
  ).toHaveLength(1);
  expect(state.counts().verifies).toBe(0);
  await page.evaluate(() => {
    (window as Window & { paymentTestMode: string }).paymentTestMode = "success";
  });
  await page.getByRole("button", { name: "Check / Retry Payment", exact: true }).click();
  await expect(page).toHaveURL(/order-success/);
  expect(state.counts().verifies).toBe(1);
});

test("success URL cannot claim payment success for an unpaid order", async ({ page }) => {
  const state = await setup(page);
  state.account.orders = [
    {
      id: "SR-BROWSER",
      createdAt: new Date().toISOString(),
      address: state.address,
      items: [state.item],
      total: 340,
      payment: "RAZORPAY",
      paymentStatus: "PENDING",
      status: "preview",
    },
  ];
  await page.goto("/order-success?order=SR-BROWSER");
  await expect(
    page.getByRole("heading", { name: "Payment not confirmed", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Payment confirmed.", { exact: false })).toHaveCount(0);
});

test("returning to checkout after dismissal reuses the same request ID", async ({ page }) => {
  const state = await setup(page, "dismiss");
  await page.goto("/checkout");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "PAY NOW", exact: true }).click();
  await expect(page).toHaveURL(/payment-failed/);
  await page.addInitScript(() => {
    (window as Window & { paymentTestMode: string }).paymentTestMode = "success";
  });
  await page.getByRole("link", { name: "Back to checkout", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "PAY NOW", exact: true }).click();
  await expect(page).toHaveURL(/order-success/);
  expect(state.requestIds).toHaveLength(2);
  expect(state.requestIds[1]).toBe(state.requestIds[0]);
});

test("disabled payment service never creates an online order", async ({ page }) => {
  const state = await setup(page);
  state.disable();
  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: "PAY NOW", exact: true })).toBeDisabled();
  expect(state.counts().creates).toBe(0);
});
