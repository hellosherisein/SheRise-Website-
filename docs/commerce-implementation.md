# SheRise commerce implementation — 29 October 2026

## Activation decision

Local implementation only. No deployment, production migration, payment, wallet recharge or shipment was performed. Existing `.env` and Razorpay credentials were not changed. Keep `EKART_SHIPPING_ENABLED=false`.

**Do not deploy this branch for accepting purchases yet.** The supplied Ekart OpenAPI 3.8.10 is now available at `docs/ekart-openapi.yaml`. Authentication, V2 serviceability, V3 account charges, guarded prepaid/COD shipment creation, labels and authenticated tracking polling are implemented and mock-tested. Actual account credentials, confirmed pricing, staged MySQL verification and explicit live activation remain required. Webhook HMAC details are still incomplete. See [the current Ekart implementation report](ekart-integration.md).

The read-only MySQL connection was retried and returned `ECONNREFUSED`. Checked-in SQL and mocked adapters are verified; actual MySQL schema/data and migrations are not.

## Implemented changes

- COD uses discounted product subtotal **strictly above 1000**, excluding shipping, donation and product tax for minimum eligibility. The actual final collectible including shipping, product tax, donation and any COD fee must be **at most 20000**. Defaults are configurable in authenticated Shipping Settings; the carrier ceiling cannot be configured above 20000. Online payment remains selectable at every serviceable amount. Destination COD availability is mandatory. COD starts PENDING and never invokes Razorpay.
- Cart restore/add/update quantities are capped against current stock, including other cart lines for the same product. Removed the `Math.max(stock,99)` bug. Retained the old-pack correction interface.
- Server checkout re-prices the catalog, validates coupon restrictions under locking, checks a five-minute customer-owned quote fingerprint, current business configuration, package measurements, product prices, discount and tax, and consumes the quote transactionally. Retry identity excludes the rotating quote ID. Neither browser-supplied prices nor charges are trusted.
- Coupons enforce active dates, minimum eligible amount, global/per-customer usage, first-order restriction and product/category targeting. Coupon usage is written with the order. Cancelled orders do not consume usage. Development coupon routing now matches Hostinger behavior.
- Product shipping weight (g), length/width/height (cm) are nullable, validated together, persisted and returned by both catalog implementations and both admin handlers. Existing descriptive product dimensions/pad length remain unchanged. Unknown measurements block quoting. Multi-unit orders require an admin-validated box with maximum units/weight, tare weight and measured dimensions; dimensions are never added together.
- New shipping quote calculation separates carrier cost, customer shipping charge, shipping tax, COD fee, donation and product tax. Free shipping retains the existing 499 threshold as configurable policy and preserves carrier cost internally. Product GST uses the configured product percentage, with discount allocated to eligible product lines. Carrier rates and serviceability are injectable for isolated tests; no real carrier prices are assumed.
- Product PIN form, cart and checkout use the backend quote API. Quote state resets/recalculates on PIN, payment, items, coupon and donation changes; outdated requests are aborted and quotes refresh before expiry. Unsupported/unverifiable delivery blocks order submission.
- Stock is allocated with inventory row locks within order creation. Prepaid reservations expire after 30 minutes; COD reservations remain until cancellation or fulfillment. Verified prepaid payment commits stock once. Cancellation releases reserved stock or restocks committed, undispatched stock once. Multiple ambiguous inventory rows block purchases rather than double-counting product and variant inventory. Variant-specific stock mapping remains necessary for a catalog with multiple variant rows and no product-level stock.
- Verified prepaid capture and COD creation insert an idempotent BLOCKED (live disabled) or QUEUED (approved live activation) shipment queue record keyed by internal order. An unpaid online order cannot queue fulfillment. Late payment for a cancelled/expired order records payment but does not queue shipment; manual refund review is required.
- COD settlement is separate from shipment and order status. Authenticated admins must explicitly confirm an evidence reference and exact collected amount. Delivery alone never marks COD paid. Settlement verification is transactional/idempotent and writes the COD payment record.
- Admin Shipping Settings supports COD thresholds, pickup contact/address (PIN 400013), account pricing selection, customer shipping policy and validated multi-item boxes. Activation is server-controlled and shown separately. Order details display shipment state, stored shipment ID/AWB, customer charge, internal carrier cost/tax/COD fee, errors, tracking history and settlement information when records exist.
- Confirmation displays address, customer name, products, subtotal, discount, shipping, tax, donation, COD fee, total, payment method/status and order status. COD explicitly displays the amount payable on delivery. Customer history exposes only owner-scoped shipment/tracking data and removes incorrect preview payment messaging for real orders. Tracking events are never synthesized.
- Strict TypeScript and lint errors were repaired without disabling checks. The router shim now types loader data and API handler context. Existing stale test fixtures were corrected. Formatting changes throughout existing linted files were needed to resolve the repository's formatting errors; no website redesign was performed.

## External integration boundary

The provider adapter now uses the supplied YAML. See [ekart-integration.md](ekart-integration.md) for exact endpoints, payload semantics, safety gates, test results and account configuration. Implemented code remains distinct from unverified production behavior.

- Authentication/token expiry/401 recovery and safe read retries are implemented.
- V2 coverage and documented V3 serviceability/charges are implemented; configured courier group and explicit seller pricing confirmation are required.
- Creation is gated, claimed durably and never automatically retried after an uncertain response. Admin reconciliation verifies an existing carrier ID rather than creating a duplicate.
- Admin PDF labels, authenticated tracking polling, customer tracking/owner isolation and separate COD settlement are implemented.
- The estimate API schema has undefined required fields and is not used. Webhook HMAC algorithm/header/encoding are absent; the reserved endpoint returns 503 without writes. No signature mechanism is invented.
- A read-only live Ekart check returned HTTP 401 Unauthorized; no serviceability/rate success is claimed. Production database verification still fails with ECONNREFUSED. No live shipments or payments have been performed.

## Local APIs and deployment routing

- `POST /api/shipping/quote`: customer authentication/origin guard, rate limit, server catalog/coupon validation and quote persistence. Requires configured credentials, account pricing confirmation and carrier-verified delivery; missing configuration fails closed.
- `GET/POST /api/admin/shipping-settings`: existing admin session required; business settings only, no credentials accepted or returned.
- `GET /api/admin/shipping-orders?order=SR-…`: admin shipment details and recorded events.
- `POST /api/admin/shipping-orders`: guarded create/retry, existing-ID reconciliation, authenticated tracking synchronization and evidence-backed `verify-cod`.
- `GET /api/admin/shipping-label?order=SR-?`: authenticated carrier PDF download.
- `POST /api/shipping/ekart-webhook`: intentionally disabled with 503 until signature details are confirmed.
- Existing Razorpay `/api/payments/config`, `/create-order`, `/verify`, `/status`, `/webhook` routes are retained. The existing webhook remains `/api/payments/webhook`; configure it in Razorpay using the deployment documentation, not Ekart.

Development admin login/logout also use the existing authenticated session handlers. New routes are wired through Vite development dispatch and the existing Hostinger production dispatch. API requests remain JSON responses rather than SPA HTML. Hostinger entry/deployment architecture is retained.

## Database migration and rollback

Review `database/migrations/20261029-commerce-up.sql`. It adds four nullable product fields and five tables: `commerce_configuration`, `shipping_quotes`, `stock_allocations`, `ekart_shipments`, `ekart_shipment_events`. Existing orders, customers, inventory and payment tables are retained. Existing generic order tracking columns are reused.

`node scripts/migrate-commerce.mjs` prints the plan without connecting. The runner's `--apply` mode additionally requires `COMMERCE_MIGRATION_APPROVED=true`, must be explicitly approved, and should run only after backup. It detects already-added product columns and creates missing tables without replacing records, allowing interrupted migration to resume. It does not validate an existing incompatible table definition; compare resulting schema separately.

No migration was applied. `20261029-commerce-down.sql` documents a non-destructive application rollback: retain the additive records for recovery, disable purchases, release outstanding reservations through approved maintenance and restore the previous application. Do not drop financial/shipment history or blindly restore inventory.

`node scripts/expire-stock.mjs` is a read-only candidate count by default. `--apply` requires separate operator approval and `COMMERCE_MAINTENANCE_APPROVED=true`. After staging validation, schedule approved expiry maintenance regularly. Never expire SUCCESS payments. Cancelled unpaid orders cannot be reopened; late captured payments require manual refund review. This maintenance command has not been run against the configured database.

## Verification

Passed locally with fake gateway/database/carrier adapters:

- `npm run typecheck`
- ESLint: zero errors and 28 advisory warnings.
- `node scripts/verify-commerce.mjs`: COD boundaries 999/1000/1001/19999/20000/20001; minimum versus collectible basis; restricted PINs; packaging; rate failures; carrier-cost retention; product tax; token caching; concurrent stock allocation model; rollback and duplicate stock/queue protection; coupon restrictions and settlement evidence validation.
- `node scripts/verify-store.mjs`
- `node scripts/verify-payments.mjs`
- `node scripts/verify-admin-orders.mjs`, including unauthenticated shipping action rejection.
- `node scripts/verify-mysql-addresses.mjs`, with an isolated adapter, not a real MySQL server.
- Browser regressions: 28 tests across checkout-session, payments, shipping-checkout, product-details and quick-view suites. Additional product-detail and quick-view regressions also passed. Browsers used a static test server that cannot execute any backend/API operation. APIs and Razorpay widget were mocked.
- Client/SSR build using `npm run build:verify`, which bypasses SEO-generation prebuild side effects. Existing SEO files remain unchanged. Build warns about the existing large client bundle and mixed dynamic/static imports.
- Client bundle scan found no configured private credential values.

Hostinger `require()` startup and JSON/authentication routing checks also passed using fake configuration; no gateway or database calls.

Actual MySQL behavior, row-lock scheduling/deadlocks, migrations, provider authentication, gateway transactions, webhook delivery, carrier rates, AWBs, labels and settlement remain unverified. The concurrency test models serialized database transactions and asserts lock usage; a staging MySQL concurrency test is still required.

## Environment and controlled deployment checklist

Preserve existing MySQL, admin session, APP_ORIGIN and Razorpay variables. New server-only placeholders are in `.env.example`:

```dotenv
EKART_CLIENT_ID=
EKART_USERNAME=
EKART_PASSWORD=
EKART_API_BASE_URL=
EKART_SHIPPING_ENABLED=false
COMMERCE_MAINTENANCE_APPROVED=false
```

`COMMERCE_MIGRATION_APPROVED` is a temporary operator gate for the migration runner, not an application activation flag. Do not prefix secrets with `VITE_` or save credentials through Shipping Settings. Existing local Razorpay activation/live credentials were not changed or contacted.

1. Review the implemented YAML adapter and provider-specific mocked tests; obtain confirmed account pricing/courier group and missing webhook security details.
2. Restore read-only MySQL access and verify target Hostinger schema/version and permissions. Test migrations and concurrency in a disposable staging database first.
3. Obtain separate production migration approval, back up records, execute the additive migration and verify all columns/tables. Ensure the existing Razorpay migration is also present.
4. Configure actual package measurements, validated boxes, pickup details, pricing plan and shipping/COD business settings. Review product GST configuration and whether existing selling prices include tax before enabling taxed products.
5. Run the safe suites and `npm run build:verify`; check the built frontend contains no secrets. Use the existing Hostinger build/start environment. Do not regenerate or replace existing SEO files accidentally.
6. In staging, complete Razorpay Test Mode payments/retries/webhooks and Ekart's documented sandbox or approved non-chargeable verification. Confirm labels, events, duplicate protection and settlement behavior.
7. Configure the final carrier webhook only after documented authenticity validation exists; test retries and invalid events.
8. Obtain deployment approval. Deploy through the existing Hostinger process with live shipping still false; inspect logs and admin/customer records.
9. Obtain separate explicit approval before live shipment activation or any real payment/shipment. Confirm account activation, auto-capture, wallet/billing conditions and maintenance scheduling first.

The implementation is ready for local review and staged validation, **not live activation**. Live account/contract acceptance, missing webhook signature details (if push updates are required), and successful real MySQL staging verification remain release blockers.
