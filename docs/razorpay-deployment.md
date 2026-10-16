# Razorpay checkout deployment

The React checkout now uses the official Razorpay Standard Checkout widget. The Node backend uses the official `razorpay` SDK, the existing MySQL customer session, server catalog, coupon/donation/tax/shipping calculations, and existing `orders`, `order_items`, and `payments` tables. The existing rule remains: totals of ₹1,000 or more use Cash on Delivery; smaller totals use Razorpay.

Online orders are not paid merely because a browser callback succeeds. The backend validates its saved gateway order ID, HMAC signature, customer ownership, gateway payment/order association, amount in paise, INR currency, captured payment, and paid gateway order. Authorized payments remain pending. References survive server restarts; a retry checks prior payment before opening another widget.

## Environment and activation

Set these in Hostinger's server environment, separately from the GitHub source:

```dotenv
APP_ORIGIN=https://hellosherise.com
RAZORPAY_ENABLED=false
RAZORPAY_KEY_ID=<test-key-id-for-initial-testing>
RAZORPAY_KEY_SECRET=<matching-server-secret>
RAZORPAY_WEBHOOK_SECRET=<separate-random-secret-at-least-32-characters>
```

Keep the existing MySQL and admin session variables. Never use a `VITE_` prefix for private keys. `.env` is ignored by Git; the provided API keys were saved there locally, with payment activation disabled. A separate random webhook secret was generated locally. Local `.env` values do not configure Hostinger automatically. Do not copy that file into a public/static directory.

Because the live API secret was pasted into chat, regenerate it in Razorpay before enabling live mode. Update the server environment with the replacement credentials.

Test keys were not supplied. Before accepting real customer payments, use your Razorpay Test Mode API keys and a Test Mode webhook with `RAZORPAY_ENABLED=true`. Complete the checks below. Then configure the corresponding Live Mode keys/webhook and enable the production deployment. If enabled payments have invalid configuration, startup logs `Online payments disabled:` with the configuration issue and disables online payments for that process. The website and admin can still start. Correct the Hostinger environment and restart the app to enable payments; never bypass payment verification.

## Database and Hostinger deployment

Use Node.js 24.13+ with the existing commands:

Hostinger's LiteSpeed launcher loads `app.js` using `require()`. The entry dynamically imports the asynchronous server so top-level await does not produce `ERR_REQUIRE_ASYNC_MODULE`. Keep the entry file set to `app.js`.

```sh
npm ci
npm run migrate:payments
npm run build
npm start
```

The additive migration creates only `razorpay_checkouts` and `razorpay_webhook_events`, with unique gateway references and event IDs. It does not drop or replace existing data. The existing `payments` table records attempts. Repeated confirmations are serialized under the internal order lock. Failed/authorized events cannot downgrade a captured payment or full refund.

If these tables are absent, the payment API can create them on first use if its database user has CREATE permission. With a restricted application user, run the migration once using a database user with CREATE permission, then start the app with its normal user. Existing tables only need to be readable/writable; the API does not require CREATE permission after migration.

Keep the frontend and backend on the same HTTPS domain. The application exposes `/api/payments/*` through the existing Hostinger server. Browser payment mutations require a valid customer cookie and the configured origin. Do not add wildcard CORS. No real payment has been triggered by this implementation work.

## Razorpay Dashboard

Configure a webhook in the appropriate Test/Live Mode:

- URL: `https://hellosherise.com/api/payments/webhook`
- Secret: exactly the server's `RAZORPAY_WEBHOOK_SECRET` value; this is separate from the API secret.
- Events: `payment.captured`, `payment.failed`, `order.paid`.
- Enable automatic capture for Standard Checkout. An authorized-only payment is not shown as paid.

The endpoint verifies the signature on the raw request bytes, rejects invalid signatures and oversized payloads, records event IDs, and fetches trusted gateway status again. Duplicate events are safe. Out-of-order failed events do not undo paid status. Refund status is recognized during reconciliation; this change does not initiate refunds or configure refund webhooks.

See [Razorpay integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) and [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

## Verification and operating the checkout

Automated, isolated checks executed with fake gateway responses, not a Razorpay account:

```sh
npm run test:payments
node scripts/verify-server-startup.mjs
npm run test:mysql-accounts
npm run test:admin-orders
npx playwright test tests/checkout-session.spec.ts tests/payments.spec.ts
npm run build
```

Coverage includes trusted prices and donation/coupon/shipping totals, tampered amounts/currency/order IDs, invalid signatures, customer ownership, origin checks, authorization versus capture, duplicate callbacks/webhooks, late failure events, rollback, restart reconciliation, disabled configuration, request size limits, desktop/mobile checkout, double submits, abandoned/dismissed checkout and safe retry, cart preservation/clearing, and avoiding false success on a manually opened success URL.

Still required in your Razorpay account: Test Mode payments, real widget payment methods/device behavior, webhook delivery/retries, account activation and auto-capture configuration, and a separately authorized small live payment. These were not tested against the gateway because only live credentials were supplied and no real charge was authorized. The additive migration was not run against production MySQL; the configured local MySQL service was unavailable. The built Node server was smoke-tested with activation disabled. TypeScript reports 88 pre-existing errors; this integration adds none.

For an authorized live check, place a small eligible order on the production HTTPS domain, complete payment, and verify all of the following: the account order has `paymentStatus=SUCCESS`; its payment ID and amount match Razorpay Dashboard's captured payment; the gateway order is paid; the matching Admin Orders row shows payment status/ID/method/date; and the webhook delivery succeeds. Restart the app and confirm the same paid order remains visible. Never use the success URL alone as proof of payment.

An unfinished customer can use My orders → Check / Retry Payment. The cart is retained until backend confirmation. Admin Orders has a payment status filter and search by payment ID. Unpaid Razorpay orders cannot be packed/shipped/delivered. Cash on Delivery remains payable on delivery, not automatically marked paid.

Existing fulfillment/inventory behavior is retained; this work does not add stock reservations, automatic shipment creation, or automated refund issuance. Paid cancellations require the existing operational refund process/Razorpay Dashboard. Old preview orders are not converted into paid orders.

## Changed files

The files changed for this integration are listed below; `.env` is intentionally excluded from version control.

<!-- integration-files -->

- `.env.example`
- `api/_admin-errors.mjs`
- `api/_admin-orders.mjs`
- `app.js`
- `docs/razorpay-deployment.md`
- `package-lock.json`
- `package.json`
- `scripts/migrate-payments.mjs`
- `scripts/verify-admin-orders.mjs`
- `scripts/verify-mysql-addresses.mjs`
- `scripts/verify-payments.mjs`
- `server/hostinger.mjs`
- `src/features/account-pages.tsx`
- `src/features/checkout-pages.tsx`
- `src/lib/customer-types.ts`
- `src/lib/payments.ts`
- `src/lib/site-config.ts`
- `src/main.tsx`
- `src/routes/admin.tsx`
- `src/routes/payment-failed.tsx`
- `src/server/customer.server.ts`
- `src/server/payment-schema.server.ts`
- `src/server/payment-service.server.ts`
- `src/server/payments.server.ts`
- `src/server/production-api.ts`
- `tests/checkout-session.spec.ts`
- `tests/payments.spec.ts`
- `vite.config.ts`
