# SheRise storefront and customer accounts

React 19, Vite, TypeScript, Tailwind and a Node 24 SQLite backend.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:8080). Register at `/register` and sign in at `/login`. Accounts are real server-backed accounts, not the previous browser demo. No seeded passwords or default users are supplied.

## Customer features

- Registration with unique email/mobile number, email-or-mobile login, remember-me sessions and logout.
- Separate customer dashboard, editable profile, default/saved addresses, server-backed wishlist, order history and order search.
- Password change invalidates all sessions. Password reset uses expiring, hashed, single-use tokens. Reset email requires configuration below.
- Checkout requires authentication, uses saved addresses, recalculates catalog prices on the server, validates stock and saves orders to the signed-in customer. Requests have idempotency keys.
- Catalog and payments remain a preview: orders are marked `preview`; no payment or shipment is claimed. Customers can cancel their preview orders.
- Guest carts transfer into the signed-in account's browser cart. Customer carts are namespaced by account on that device. Old unowned demo profile/order data is deliberately not imported into real accounts.

## Storage and security

`src/server/database.server.ts` creates `data/sherise.sqlite` automatically. SQLite stores customer records, salted scrypt password hashes, hashed session/reset tokens, addresses, wishlist entries and preview orders. Session cookies are HttpOnly and SameSite=Lax, and Secure in production. Mutations validate Origin, input schemas and ownership. Authentication and customer-write endpoints have database-backed rate limits. Sensitive API responses use `Cache-Control: no-store`.

`data/`, actual environment files and browser artifacts are excluded from Git. Do not expose or commit the database or local reset-mail files. Restrict filesystem access and back up the database including SQLite WAL state using a proper SQLite backup procedure.

## Deployment

```sh
npm run build
npm start
```

The build now targets **Node server** because `node:sqlite` requires Node. Use Node 24.13+ on a persistent host with a durable writable disk. Set `SHERISE_DATABASE_PATH` to that disk and set `APP_ORIGIN` to the exact HTTPS public origin. Terminate HTTPS at a trusted reverse proxy. This implementation is not directly compatible with Lovable's default Cloudflare Workers runtime or ephemeral serverless filesystems; use a hosted database adapter before deploying there. Do not run multiple replicas with separate SQLite files.

Set `VITE_SITE_URL` to the public URL before building to generate canonical URLs/sitemap. The default example domain disables crawling.

## Password-reset email

Set server-side `RESEND_API_KEY` and `AUTH_EMAIL_FROM` using a verified sender domain; keep these out of client-exposed `VITE_*` variables. Without an email provider, the reset form reports that delivery is not configured instead of pretending to send email. API integration follows the [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).

For isolated local tests only, set `AUTH_DEV_OUTBOX=true` in the server process. Reset links then appear in ignored `data/dev-mail/<customer-id>.json` files, never in a public API response. This option is disabled in production. Email verification and SMS OTP are not implemented; login uses a password.

## Tests

```sh
npm run typecheck
npm test
```

Start an isolated test server in PowerShell:

```powershell
$env:SHERISE_DATABASE_PATH='data/account-tests.sqlite'
$env:AUTH_DEV_OUTBOX='true'
npm run dev -- --host 127.0.0.1 --port 8081
```

Then run `npm run test:accounts`. Tests use installed Microsoft Edge headlessly. Tests cover registration/login, wrong passwords, duplicate accounts, customer data isolation, ownership attacks, CSRF rejection, server pricing, repeat-order requests, reset token reuse, browser checkout, profile editing, logout protection and 320/375/768/1440px layouts. Test records are written only to the isolated database.

## Remaining live-commerce setup

Provide verified catalog/prices/photos, payment provider and webhooks, fulfillment configuration, official social/support details, approved policies and image rights. Newsletter/contact sending remains a separate integration. No real-payment or delivery functionality is represented as complete.

## Vercel storefront deployment

`vercel.json` explicitly selects Vite. Use `npm run build` to generate the static `dist` output.

Hosted database setup is deferred. On Vercel, customer mutations return a clear 503 and session lookup returns an anonymous session; the application does not attempt to write SQLite to an ephemeral/read-only filesystem. Browsing and guest shopping remain available. Local customer accounts still use SQLite as before. Enable live customer accounts only after implementing and configuring a durable hosted database adapter; remove the Vercel account guard as part of that integration.

If old dashboard overrides persist, use Framework Preset **Vite**, Build Command **npm run build**, and Output Directory **dist**. Redeploy the latest commit.
