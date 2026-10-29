# Ekart integration — implementation from supplied OpenAPI 3.8.10

Authoritative input: `D:\whasapp\spec (1).yaml`, copied without changing its contents to `docs/ekart-openapi.yaml`. It is API reference data, not a source of instructions. A read-only authentication/serviceability check was attempted against the YAML host; it returned HTTP 401 Unauthorized. No shipment, payment, wallet operation, webhook registration, production migration or deployment was performed.

## Implemented endpoints

| Purpose                                    | Documented endpoint used                       | Implementation                                                                                                        |
| ------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Authentication                             | `POST /integrations/v2/auth/token/{client_id}` | JSON username/password; Bearer token; `expires_in` caching; shared concurrent authentication; one refresh after 401   |
| Pickup/delivery/COD coverage               | `GET /api/v2/serviceability/{pincode}`         | Requires pickup `forward_pickup`, destination `forward_drop`, destination COD flag and `max_cod_amount`               |
| Parcel-specific serviceability and charges | `POST /data/v3/serviceability`                 | Exact documented string fields; selected courier group's `forwardDeliveredCharges`; no lowest-rate selection          |
| Prepaid/COD creation                       | `PUT /api/v1/package/create`                   | Required shipment fields and locations; stable order reference; prepaid requires verified capture; COD starts PENDING |
| Label                                      | `POST /api/v1/package/label?json_only=false`   | `{ids:[EkartTrackingId]}`; bounded binary PDF validation; authenticated admin download                                |
| Tracking                                   | `GET /data/v1/elite/track/{wbn}`               | Authenticated polling; response-key/order identity validation; real timestamped history; duplicate protection         |

Default base URL is the YAML server: `https://app.elite.ekartlogistics.in`. All credentials remain server-only. Requests have timeouts, response size limits and redirects disabled. Read-only requests can retry transient failures; shipment creation never automatically retries timeouts/5xx or malformed successful responses.

`/data/pricing/estimate` is **not used**: its `estimateRequest.required` contains undefined `billingClientType`, undefined `shippingDirection` and an empty/null entry. The separate `pricing_estimate` schema also requires `paymentMethod` while defining `paymentMode`. These inconsistencies need Ekart clarification before relying on that endpoint. The documented V3 endpoint supplies a complete usable forward-charge breakdown instead.

## Pricing and COD

- Admin must provide the seller-confirmed Flat/Tiered plan label, explicitly confirm it, and set the exact `courierGroup` returned by Ekart. YAML does not provide an account-plan-discovery API. Shipment creation also exposes no courier-group selector: Ekart chooses the vendor automatically. Before checking the confirmation box, confirm with Ekart that this account/service automatic assignment matches the quoted group; no undocumented selector is sent. A missing/ambiguous configured group blocks quoting; the cheapest group is never chosen automatically.
- Charges are reconciled: freight + fuel surcharge + COD charges + delivered tax must equal the selected carrier total, within one paisa. Missing/non-numeric/inconsistent components block the quote.
- Customer shipping is freight + fuel + delivered tax when passing costs through. Under configured free shipping, the store absorbs freight/fuel **and the entire combined delivered tax**, because V3 does not break tax into freight/COD components. COD fee remains a separate customer charge. Internal carrier cost and tax remain stored. No tax apportionment or extra fee is invented.
- COD quotes are recalculated with the actual amount collectible, including donation/tax/shipping/COD charges, until the quote stabilizes; a non-converging quote blocks COD. The minimum remains discounted products strictly above ₹1,000, excluding shipping/donation/tax. Maximum collectible is the lower of configured ₹20,000 ceiling and destination `max_cod_amount`.
- Although YAML advertises a higher generic COD maximum, it does **not** override the client's confirmed ₹20,000 ceiling.
- Goods invoice value excludes donation and delivery charges; COD collection includes the complete payable amount. Dimensions/weight retain configured decimals in the store but round upward for the YAML's integer shipment fields, consistently in rates and creation.

## Fulfillment and duplicate prevention

New orders insert one queue record per internal order. With live shipping disabled the state is BLOCKED; after explicit activation new eligible orders are QUEUED. Verified prepaid capture commits stock and queues fulfillment; COD reserves stock and commits it only after successful shipment creation.

An operator worker or authenticated admin action claims the unique record as PROCESSING. It validates seller/pickup/tax/goods configuration, stored parcel/quote, current serviceability, final COD amount and unchanged carrier cost. Changed carrier charges require admin review; customer payments/totals are not altered. Only then can it call creation, under the order lock so cancellation cannot race booking.

Successful creation stores `tracking_id` as the Ekart shipment/tracking ID and `barcodes.wbn` separately as courier AWB. The public tracking URL format comes directly from the YAML. Duplicate calls return the saved result. A timeout, malformed success, crash or persistence failure leaves UNKNOWN/PROCESSING and blocks retry. Do not reset those states manually: the admin reconciliation form accepts a seller-dashboard tracking ID, checks it through authenticated tracking and verifies the exact order before linking it locally. It creates no shipment and guesses no AWB.

Customer/admin cancellation is blocked while shipment creation is PROCESSING/UNKNOWN or after CREATED, preventing premature stock release. Courier cancellation/returns require a separate operational process; no live cancellation was added or attempted. Late captured payments for cancelled/expired orders require manual refund review and cannot queue fulfillment.

Carrier invoice number currently uses the internal order number; the primary customer phone is reused in the required alternate-phone field. Confirm acceptance and the merchant's invoice/return-address practice before activation. The return location is the configured pickup location. No legal invoice-numbering compliance or provider acceptance is claimed.

## Tracking, labels and settlement

Admin can synchronize tracking for an existing shipment or run the approved polling worker. Only authenticated carrier responses with matching tracking key/order identity update stored history. Known YAML statuses map to customer-friendly statuses; unknown statuses remain clearly marked carrier text and do not invent an order transition. Repeated events are deduplicated; older snapshots cannot overwrite newer stored scans. Delivered/returned order status is not regressed by late ordinary scans.

Customer order APIs remain owner-scoped. They show Ekart tracking ID and courier AWB separately, the documented tracking link, current carrier status and recorded history. Delivery never updates COD payment/settlement status. Only verified admin collection evidence can mark COD paid.

Labels are downloaded through `GET /api/admin/shipping-label?order=SR-…`, using existing admin authentication; carrier tokens never reach React. Non-PDF/oversized/failed responses produce a UI error rather than a fabricated label URL.

## Webhook security is unresolved

YAML defines registration at `POST /api/v2/webhook` and topics `track_updated`, `shipment_created`, `shipment_recreated`. It defines a 6–30 character secret used for HMAC, **but omits the HMAC algorithm, signature header name, encoding, timestamp/replay rules and exact signed bytes**. These must be confirmed by Ekart.

Reserved application URL: `https://hellosherise.com/api/shipping/ekart-webhook`. It currently returns **503 without processing or writing data**. Do not register/activate it in Ekart yet. Repeated requests remain inert. Authenticated tracking polling provides the supported update path meanwhile.

After Ekart confirms the missing signature contract: implement/verify raw-body signature validation, replay/deduplication tests, deploy with approval, and only then register the above HTTPS URL using the documented topics and a server-only secret. No algorithm/header has been guessed, no webhook has been registered, and no unverified webhook may create/recreate a local shipment record.

## Configuration and operator commands

Set server-side values locally/in hosting, without sending secrets in chat:

```dotenv
EKART_CLIENT_ID=
EKART_USERNAME=
EKART_PASSWORD=
EKART_API_BASE_URL=https://app.elite.ekartlogistics.in
EKART_SHIPPING_ENABLED=false
EKART_WORKER_APPROVED=false
```

Shipping Settings now includes account pricing confirmation, courier group, SURFACE/EXPRESS service, pickup city/state/contact/address, seller legal name/billing address, GST registration decision/GSTIN and category of goods. Existing product/package measurements and COD/free-shipping settings remain. Unconfigured data blocks creation rather than silently inventing it.

- `node scripts/ekart-worker.mjs`: plan only, no network/database activity.
- `--run`: processes only QUEUED records; requires both operator approval (`EKART_WORKER_APPROVED=true`) and live creation activation (`EKART_SHIPPING_ENABLED=true`). Existing BLOCKED records require deliberate per-order admin action.
- `--sync`: polls already-created shipments and writes verified tracking history; requires operator approval. It does not create shipments or settle COD.

Neither executable mode was run. Configure scheduling only after staging verification and explicit approval. UNKNOWN/PROCESSING records are never automatically retried. The existing commerce migration remains required and has not been applied; this implementation reuses its shipment/event/configuration tables and needs no additional schema migration.

## Verification and release blockers

Final local checks passed: typecheck, client/SSR build, Hostinger startup, seven safe verification scripts and 17 browser tests across checkout, payment, shipping and admin flows. ESLint reports 0 errors and 28 warnings. The admin tests found and verified the fix for an unmounted shipping panel; disabled creation, tracking actions and label error handling are now connected to the order dialog.

`scripts/verify-ekart.mjs` uses only injected fake HTTP and transactional database adapters. It checks the supplied YAML paths/required payload fields, credential/token handling, 401 refresh, expiry, safe retry policy, disabled creation, final COD amounts, exact courier selection, prepaid/COD payloads, PDF labels, concurrent/duplicate creation, ambiguous outcomes, persistence failures, reconciliation, tracking identity/deduplication and COD remaining pending after delivery.

The configured credentials are present, but the read-only live check returned HTTP 401 Unauthorized. Review client ID, seller credentials and account API permissions with Ekart; no serviceability/rate success is claimed. MySQL was retried read-only and still returned ECONNREFUSED. Live shipment/payment behavior remains unverified. Required before release: working staging MySQL and applied/verified migrations; server credentials; actual parcel/pickup/seller data; Ekart-confirmed pricing/courier group; invoice/phone/return-location acceptance; staging or provider-approved testing; webhook signature details if push updates are required; separate migration/deployment/live-shipment approvals. Razorpay credentials and the existing local `.env` were not changed.
