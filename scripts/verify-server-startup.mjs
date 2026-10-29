import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  return String(port);
}

// Uses the built server with fake configuration; no gateway or database calls.
for (const [enabled, webhookSecret] of [
  ["false", ""],
  ["true", ""],
  ["true", "too-short"],
]) {
  // Hostinger's LiteSpeed launcher uses require(), not `node app.js`.
  const child = spawn(process.execPath, ["-e", "require('./app.js')"], {
    env: {
      ...process.env,
      PORT: await availablePort(),
      NODE_ENV: "production",
      RAZORPAY_ENABLED: enabled,
      RAZORPAY_KEY_ID: "rzp_test_FAKE",
      RAZORPAY_KEY_SECRET: "fake-secret",
      RAZORPAY_WEBHOOK_SECRET: webhookSecret,
      ADMIN_SESSION_SECRET: "startup-test-admin-secret-32-characters-long",
      MYSQL_HOST: "127.0.0.1",
      MYSQL_USER: "fake",
      MYSQL_DATABASE: "fake",
      APP_ORIGIN: "https://example.test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server failed to start")), 15000);
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
        const match = output.match(/listening on port (\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve(Number(match[1]));
        }
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exited early: ${code}`));
      });
    });
    const origin = `http://127.0.0.1:${port}`;
    const page = await fetch(`${origin}/category/sanitary-pads`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<html/i);
    const config = await fetch(`${origin}/api/payments/config`);
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), { enabled: false });
    const delivery = await fetch(origin + "/api/shipping/quote", {
      method: "POST",
      headers: { origin: "https://example.test", "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(
      delivery.status,
      401,
      "Production shipping API reaches customer authentication without touching a database",
    );
    assert.match(delivery.headers.get("content-type"), /application\/json/);
    for (const module of [
      "shipping-settings",
      "shipping-orders",
      "shipping-label",
      "shipping-connection",
    ]) {
      const result = await fetch(origin + "/api/admin/" + module);
      assert.equal(result.status, 401);
      assert.match(result.headers.get("content-type"), /application\/json/);
    }
    for (let retry = 0; retry < 2; retry++) {
      const webhook = await fetch(origin + "/api/shipping/ekart-webhook", {
        method: "POST",
        body: "{}",
      });
      assert.equal(
        webhook.status,
        503,
        "Undocumented webhook authentication must remain disabled and retries must not mutate data",
      );
    }
    const invalidImage = await fetch(`${origin}/api/catalog/product-image?id=invalid`);
    assert.equal(invalidImage.status, 400, "Production image route reaches the guarded handler");
    const invalidReviewImage = await fetch(`${origin}/api/reviews/image?review=invalid&index=0`);
    assert.equal(
      invalidReviewImage.status,
      400,
      "Production review image route reaches the guarded handler",
    );
    const blogUpload = await fetch(`${origin}/api/admin/upload-blog-image`, { method: "POST" });
    assert.equal(
      blogUpload.status,
      401,
      "Blog image upload is routed and requires an admin session",
    );
    const invalidBlogImage = await fetch(`${origin}/api/content/blog-image?id=invalid`);
    assert.equal(invalidBlogImage.status, 400);
    if (enabled === "true") assert.match(stderr, /Online payments disabled:/);
    assert.doesNotMatch(stderr, /fake-secret/);
  } finally {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    if (child.exitCode === null) {
      child.kill();
      await exited;
    }
  }
}
console.log(
  "Hostinger require() startup checks passed: disabled/invalid payments stay disabled; storefront remains available.",
);
