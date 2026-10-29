import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const photo = readFileSync("src/assets/sherise-flatlay.jpg");
const product = {
  id: "901",
  slug: "review-test-pad",
  name: "Review test pads",
  shortDescription: "Comfortable pads",
  description: "Comfortable pads",
  category: "Sanitary Pads",
  images: ["/test.png"],
  sizes: ["XL"],
  flow: ["MEDIUM"],
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

test("customer chooses photos, submits selected rating and retains saved photos on reload", async ({
  page,
}) => {
  const user = {
    id: "42",
    name: "Photo Customer",
    email: "photo@example.test",
    phone: "9876543210",
    whatsappNumber: "9876543210",
    createdAt: new Date().toISOString(),
  };
  const item = {
    slug: product.slug,
    name: product.name,
    size: "XL",
    flow: "MEDIUM",
    pack: "Pack of 8",
    quantity: 1,
    price: 200,
  };
  const order = {
    id: "SR-PHOTO",
    createdAt: new Date().toISOString(),
    items: [item],
    subtotal: 200,
    discount: 0,
    total: 240,
    payment: "Cash on Delivery",
    status: "delivered",
    address: {
      name: user.name,
      phone: user.phone,
      line1: "Test Street",
      city: "Pune",
      state: "Maharashtra",
      pin: "411001",
    },
    reviews: [] as Array<{
      slug: string;
      rating: number;
      reviewText: string;
      photos: string[];
      status: string;
      reviewedAt: string;
    }>,
  };
  const account = { user, addresses: [], wishlist: [], orders: [order] };
  let submitted: { slug: string; rating: number; reviewText: string; photos: string[] };
  await page.addInitScript(() => sessionStorage.setItem("sherise-welcome-popup-seen", "true"));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/customer/session") return route.fulfill({ json: account });
    if (path === "/api/catalog/products") return route.fulfill({ json: { products: [product] } });
    if (path === "/api/customer/order-review") {
      submitted = route.request().postDataJSON();
      order.reviews = [
        {
          slug: product.slug,
          rating: submitted.rating,
          reviewText: submitted.reviewText,
          photos: ["/api/reviews/image?review=123&index=0"],
          status: "PENDING",
          reviewedAt: new Date().toISOString(),
        },
      ];
      return route.fulfill({ json: account });
    }
    if (path === "/api/reviews/image")
      return route.fulfill({ contentType: "image/jpeg", body: photo });
    return route.fulfill({ json: { products: [], posts: [], faqs: [], reviews: [] } });
  });
  await page.goto("/account/orders");
  await expect(page.getByRole("button", { name: "1 star rating", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page
    .getByRole("textbox", { name: "Review", exact: true })
    .fill("Very comfortable product, good fit.");
  await expect(page.getByRole("button", { name: "Submit review", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "4 star rating", exact: true }).click();
  await page.getByRole("textbox", { name: "Review", exact: true }).fill("");
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Please write at least 8 characters");
  expect(submitted).toBeUndefined();
  await page
    .getByRole("textbox", { name: "Review", exact: true })
    .fill("Very comfortable product, good fit.");
  const upload = page.locator('input[type="file"]');
  await upload.setInputFiles({ name: "product.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(page.getByAltText("Your product photo 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove photo 1", exact: true }).click();
  await expect(page.getByAltText("Your product photo 1", { exact: true })).toHaveCount(0);
  await upload.setInputFiles({ name: "product.jpg", mimeType: "image/jpeg", buffer: photo });
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page.getByText("Review saved.", { exact: true })).toBeVisible();
  expect(submitted.slug).toBe(product.slug);
  expect(submitted.rating).toBe(4);
  expect(submitted.photos).toHaveLength(1);
  expect(submitted.photos[0]).toMatch(/^data:image\/jpeg;base64,/);
  await page.reload();
  await expect(page.getByAltText("Your product photo 1", { exact: true })).toHaveAttribute(
    "src",
    "/api/reviews/image?review=123&index=0",
  );
});

test("approved review photos appear only on their matching product detail page", async ({
  page,
}) => {
  let approved = false;
  await page.addInitScript(() => sessionStorage.setItem("sherise-welcome-popup-seen", "true"));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/catalog/products") return route.fulfill({ json: { products: [product] } });
    if (path === "/api/customer/session")
      return route.fulfill({ json: { user: null, addresses: [], orders: [], wishlist: [] } });
    if (path === "/api/reviews")
      return route.fulfill({
        json: {
          reviews: approved
            ? [
                {
                  customerName: "Correct Customer",
                  productSlug: product.slug,
                  rating: 4,
                  reviewText: "Photo of the right product",
                  photos: ["/api/reviews/image?review=123&index=0"],
                  reviewedAt: "today",
                },
                {
                  customerName: "Other Customer",
                  productSlug: "another-product",
                  rating: 5,
                  reviewText: "Different product review",
                  photos: ["/api/reviews/image?review=999&index=0"],
                  reviewedAt: "today",
                },
              ]
            : [],
        },
      });
    if (path === "/api/reviews/image")
      return route.fulfill({ contentType: "image/jpeg", body: photo });
    return route.fulfill({ json: { products: [], posts: [], faqs: [], reviews: [] } });
  });
  await page.goto(`/products/${product.slug}`);
  const reviews = page.getByRole("region", { name: "Customer reviews", exact: true });
  await expect(reviews).toContainText("No approved reviews for this product yet.");
  approved = true;
  await page.reload();
  await expect(reviews).toContainText("Photo of the right product");
  await expect(reviews).not.toContainText("Different product review");
  await expect(reviews.getByRole("img")).toHaveCount(1);
  await expect(reviews.getByRole("img")).toHaveAttribute(
    "src",
    "/api/reviews/image?review=123&index=0",
  );
});
