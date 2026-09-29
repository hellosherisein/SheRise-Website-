import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const origin = "http://127.0.0.1:8081";
const stamp = Date.now().toString().slice(-8);
const password = "CareForEveryDay!2026";
const makeUser = (n: number) => ({
  name: `Test Customer ${n}`,
  email: `customer-${stamp}-${n}@example.test`,
  phone: `9${stamp}${n}`,
  whatsappNumber: `8${stamp}${n}`,
  password,
  remember: true,
});
const address = {
  name: "Test Customer",
  phone: "9876543210",
  line1: "12 Test Street",
  line2: "Near Test Park",
  city: "Pune",
  state: "Maharashtra",
  pin: "411001",
  label: "Home",
  isDefault: true,
};
test("API: real authentication, isolation, ownership, server totals and reset", async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const b = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const userA = makeUser(1),
    userB = makeUser(2);
  const post = (ctx: typeof a, action: string, data: unknown) =>
    ctx.post("/api/customer/" + action, { data });
  expect((await post(a, "profile", { name: "No auth", phone: "9876543210" })).status()).toBe(401);
  expect(
    (
      await a.post("/api/customer/register", {
        headers: { Origin: "https://untrusted.example" },
        data: userA,
      })
    ).status(),
  ).toBe(403);
  const registered = await post(a, "register", userA);
  expect(registered.status()).toBe(201);
  expect(registered.headers()["set-cookie"]).toContain("HttpOnly");
  expect(registered.headers()["set-cookie"]).toContain("SameSite=Lax");
  const aData = await registered.json();
  expect(aData.user.email).toBe(userA.email);
  expect(aData.user.password_hash).toBeUndefined();
  expect((await post(b, "register", userB)).status()).toBe(201);
  expect((await post(b, "register", userA)).status()).toBe(409);
  const saved = await post(a, "address-save", address);
  expect(saved.status()).toBe(200);
  const id = (await saved.json()).addresses[0].id;
  expect((await post(b, "address-save", { ...address, id })).status()).toBe(404);
  expect((await post(b, "address-delete", { id })).status()).toBe(404);
  expect(
    (await post(a, "wishlist", { slug: "sherise-xxl-sanitary-pads", saved: true })).status(),
  ).toBe(200);
  const bData = await (await b.get("/api/customer/session")).json();
  expect(bData.addresses).toHaveLength(0);
  expect(bData.wishlist).toHaveLength(0);
  const orderInput = {
    requestId: crypto.randomUUID(),
    address,
    items: [
      {
        slug: "sherise-xxl-sanitary-pads",
        size: "XL",
        flow: "Medium",
        pack: "Pack of 8",
        quantity: 2,
        price: 1,
      },
    ],
    coupon: "RISE10",
    payment: "UPI",
  };
  const orderResponse = await post(a, "order-create", orderInput);
  expect(orderResponse.status()).toBe(201);
  const { order } = await orderResponse.json();
  expect(order.subtotal).toBe(198);
  expect(order.total).toBe(178.2);
  expect((await (await post(a, "order-create", orderInput)).json()).order.id).toBe(order.id);
  expect((await post(b, "order-cancel", { id: order.id })).status()).toBe(404);
  expect((await (await b.get("/api/customer/session")).json()).orders).toHaveLength(0);
  expect(
    (
      await post(a, "order-create", {
        ...orderInput,
        requestId: crypto.randomUUID(),
        items: [{ ...orderInput.items[0], quantity: 99 }],
      })
    ).status(),
  ).toBe(409);
  expect((await post(a, "logout", {})).status()).toBe(200);
  expect((await (await a.get("/api/customer/session")).json()).user).toBeNull();
  expect(
    (await post(a, "login", { identifier: userA.email, password: "WrongPassword123" })).status(),
  ).toBe(401);
  expect((await post(a, "login", { identifier: userA.phone, password })).status()).toBe(200);
  expect((await post(a, "forgot-password", { email: userA.email })).status()).toBe(200);
  const mail = JSON.parse(readFileSync(`data/dev-mail/${aData.user.id}.json`, "utf8"));
  const token = new URL(mail.url).searchParams.get("token");
  expect(
    (await post(a, "reset-password", { token, password: "ANewLongPassword!2026" })).status(),
  ).toBe(200);
  expect((await (await a.get("/api/customer/session")).json()).user).toBeNull();
  expect(
    (await post(a, "reset-password", { token, password: "AnotherPassword!2026" })).status(),
  ).toBe(400);
  expect((await post(a, "login", { identifier: userA.email, password })).status()).toBe(401);
  expect(
    (
      await post(a, "login", { identifier: userA.email, password: "ANewLongPassword!2026" })
    ).status(),
  ).toBe(200);
  expect((await (await a.get("/api/customer/session")).json()).orders).toHaveLength(1);
  await a.dispose();
  await b.dispose();
});
test("Browser: register, dashboard, address, wishlist, checkout, logout and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const user = makeUser(3);
  await page.goto("/register");
  await page.getByRole("heading", { name: "Create your account", exact: true }).waitFor();
  await page.getByLabel("Full name", { exact: true }).fill(user.name);
  await page.getByLabel("Mobile number", { exact: true }).fill(user.phone);
  await page.getByLabel("WhatsApp number", { exact: true }).fill(user.whatsappNumber);
  await page.getByLabel("Email address", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "CREATE ACCOUNT", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByText("Welcome back, Test.")).toBeVisible();
  await page.getByRole("link", { name: "Manage addresses", exact: true }).first().click();
  await page.getByRole("button", { name: "Add a new address" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name", { exact: true }).fill(user.name);
  await dialog.getByLabel("Mobile number", { exact: true }).fill(user.phone);
  await dialog.getByLabel("House, building & street").fill(address.line1);
  await dialog.getByLabel("City", { exact: true }).fill(address.city);
  await dialog.getByLabel("State", { exact: true }).fill(address.state);
  await dialog.getByLabel("PIN code").fill(address.pin);
  await dialog.getByRole("button", { name: "Save address", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("12 Test Street")).toBeVisible();
  await page.goto("/shop");
  await page
    .getByRole("button", { name: "Save SheRise XXL Sanitary Pads to wishlist", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remove SheRise XXL Sanitary Pads from wishlist",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add SheRise XXL Sanitary Pads to cart", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("link", { name: "Checkout", exact: true }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(user.name);
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue(address.line1);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "SAVE PREVIEW ORDER" }).click();
  await expect(page.getByRole("heading", { name: "Your preview order is saved" })).toBeVisible();
  await page.getByRole("link", { name: "View my orders" }).click();
  await expect(page.getByText("Preview order", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Preview order", { exact: true })).toBeVisible();
  await page.goto("/account/profile");
  await page.getByLabel("Full name", { exact: true }).fill("Updated Customer");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your profile has been updated.")).toBeVisible();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/customer-dashboard-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 375, height: 850 });
  await page.screenshot({ path: "artifacts/customer-dashboard-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Login to SheRise" })).toBeVisible();
  await page.goto("/account/orders");
  await expect(page.getByRole("heading", { name: "Login to SheRise" })).toBeVisible();
  await page.getByLabel("Email or mobile number").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("BadPassword123");
  await page.getByRole("button", { name: "LOGIN", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "LOGIN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
