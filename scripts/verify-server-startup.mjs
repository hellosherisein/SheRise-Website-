import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Uses the built server with fake configuration; no gateway or database calls.
for (const webhookSecret of ["", "too-short"]) {
  const child = spawn(process.execPath, ["server/hostinger.mjs"], {
    env: { ...process.env, PORT: "0", NODE_ENV: "production", RAZORPAY_ENABLED: "true",
      RAZORPAY_KEY_ID: "rzp_test_FAKE", RAZORPAY_KEY_SECRET: "fake-secret",
      RAZORPAY_WEBHOOK_SECRET: webhookSecret, MYSQL_HOST: "127.0.0.1",
      MYSQL_USER: "fake", MYSQL_DATABASE: "fake", APP_ORIGIN: "https://example.test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server failed to start")), 15000);
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
        const match = output.match(/listening on port (\d+)/);
        if (match) { clearTimeout(timer); resolve(Number(match[1])); }
      });
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Server exited early: ${code}`)); });
    });
    const origin = `http://127.0.0.1:${port}`;
    const page = await fetch(`${origin}/category/sanitary-pads`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<html/i);
    const config = await fetch(`${origin}/api/payments/config`);
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), { enabled: false });
    assert.match(stderr, /Online payments disabled:/);
    assert.doesNotMatch(stderr, /fake-secret/);
  } finally {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    if (child.exitCode === null) { child.kill(); await exited; }
  }
}
console.log("Server startup checks passed: invalid payments stay disabled; storefront remains available.");
