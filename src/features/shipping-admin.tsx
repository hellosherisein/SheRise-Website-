import { useCallback, useEffect, useState } from "react";
import { fetchAdminPayload } from "@/lib/admin-auth";
import type { CommerceConfig } from "../../api/_commerce.mjs";

function EkartConnectionStatus() {
  const [message, setMessage] = useState("API connection has not been tested in this session.");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2 rounded border p-3">
      <p role="status">{message}</p>
      <button
        type="button"
        disabled={busy}
        className="rounded border px-4 py-2"
        onClick={async () => {
          setBusy(true);
          try {
            const result = await fetchAdminPayload<{
              credentialsConfigured: boolean;
              liveEnabled: boolean;
              connection: {
                status: string;
                checkedAt: string | null;
                carrierStatus?: number | null;
              };
            }>("shipping-connection", { method: "POST" });
            setMessage(
              !result.credentialsConfigured
                ? "Ekart server credentials are missing."
                : `Ekart API: ${result.connection.status}${result.connection.carrierStatus ? ` (HTTP ${result.connection.carrierStatus})` : ""}. Live shipments: ${result.liveEnabled ? "enabled" : "disabled"}.${result.connection.checkedAt ? ` Checked ${new Date(result.connection.checkedAt).toLocaleString()}.` : ""}`,
            );
          } catch {
            setMessage("Could not check Ekart connection. Retry after checking server access.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Checking API…" : "Check Ekart API connection"}
      </button>
      <p className="text-sm">
        Checks pickup serviceability only. Results are cached for one minute.
      </p>
    </div>
  );
}

export function ShippingSettingsEditor() {
  const [config, setConfig] = useState<CommerceConfig | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetchAdminPayload<{ config: CommerceConfig }>("shipping-settings")
      .then((p) => setConfig(p.config))
      .catch((e) => setMessage(e.message));
  }, []);
  if (!config) return <p role="status">{message || "Loading shipping configuration…"}</p>;
  return (
    <form
      className="my-6 space-y-4 rounded-xl border bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const form = new FormData(event.currentTarget);
        try {
          const payload = {
            ...config,
            codMinimum: Number(form.get("codMinimum")),
            codMaximum: Number(form.get("codMaximum")),
            pickupName: String(form.get("pickupName")),
            pickupPhone: String(form.get("pickupPhone")),
            pickupAddress: String(form.get("pickupAddress")),
            pricingPlan: String(form.get("pricingPlan")),
            pricingConfirmed: form.get("pricingConfirmed") === "on",
            courierGroup: String(form.get("courierGroup")),
            serviceType: String(form.get("serviceType")),
            pickupCity: String(form.get("pickupCity")),
            pickupState: String(form.get("pickupState")),
            sellerName: String(form.get("sellerName")),
            sellerAddress: String(form.get("sellerAddress")),
            sellerGstTin: String(form.get("sellerGstTin")),
            sellerTaxStatus: String(form.get("sellerTaxStatus")),
            categoryOfGoods: String(form.get("categoryOfGoods")),
            shippingPolicy: String(form.get("shippingPolicy")),
            freeShippingThreshold:
              form.get("freeShippingThreshold") === ""
                ? null
                : Number(form.get("freeShippingThreshold")),
            packages: JSON.parse(String(form.get("packages"))),
          };
          const saved = await fetchAdminPayload<{ config: CommerceConfig }>("shipping-settings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          setConfig(saved.config);
          setMessage(
            "Shipping configuration saved. Live carrier activation remains controlled by the server environment.",
          );
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Could not save shipping settings.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-xl font-semibold">Shipping configuration</h3>
      <EkartConnectionStatus />
      <p>
        Pickup PIN: 400013. Ekart APIs are implemented. Live shipments require confirmed account
        configuration and explicit server activation.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["codMinimum", "COD product minimum (exclusive)"],
            ["codMaximum", "Maximum amount collectible on delivery"],
            ["pickupName", "Pickup contact"],
            ["pickupPhone", "Pickup phone"],
            ["pickupAddress", "Pickup address"],
            ["pricingPlan", "Confirmed Ekart account pricing plan (Flat/Tiered as agreed)"],
            ["courierGroup", "Exact courier group returned by Ekart"],
            ["pickupCity", "Pickup city"],
            ["pickupState", "Pickup state"],
            ["sellerName", "Seller legal name"],
            ["sellerAddress", "Seller billing address"],
            ["sellerGstTin", "Seller GSTIN (registered sellers)"],
            ["categoryOfGoods", "Category of goods"],
            ["freeShippingThreshold", "Free-shipping threshold (blank to disable)"],
          ] as const
        ).map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input name={key} defaultValue={config[key] ?? ""} className="admin-input" />
          </label>
        ))}
      </div>
      <label className="flex gap-2">
        <input type="checkbox" name="pricingConfirmed" defaultChecked={config.pricingConfirmed} />I
        confirmed this pricing plan and courier group with Ekart.
      </label>
      <label className="field">
        Service
        <select name="serviceType" defaultValue={config.serviceType}>
          <option>SURFACE</option>
          <option>EXPRESS</option>
        </select>
      </label>
      <label className="field">
        Seller tax registration
        <select name="sellerTaxStatus" defaultValue={config.sellerTaxStatus}>
          <option value="UNCONFIGURED">Requires configuration</option>
          <option value="REGISTERED">Registered</option>
          <option value="UNREGISTERED">Unregistered</option>
        </select>
      </label>
      <label className="field">
        Customer shipping policy
        <select name="shippingPolicy" defaultValue={config.shippingPolicy}>
          <option value="CARRIER">Pass carrier charge to customer</option>
          <option value="FREE_THRESHOLD">Free shipping at configured product threshold</option>
        </select>
      </label>
      <label className="field">
        Validated multi-item packages (JSON)
        <textarea
          className="admin-input min-h-40"
          name="packages"
          defaultValue={JSON.stringify(config.packages, null, 2)}
        />
      </label>
      <p className="text-sm">
        Each validated box needs name, maxUnits, maxWeightG, tareWeightG, lengthCm, widthCm and
        heightCm. Configure only packages confirmed suitable for your products.
      </p>
      <button className="rounded border px-4 py-2" disabled={busy}>
        {busy ? "Saving…" : "Save shipping settings"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}

type ShipmentDetails = {
  shipment: Record<string, string | number | null>;
  events: { status: string; occurred_at: string }[];
  adapterReady: boolean;
  liveEnabled: boolean;
  credentialsConfigured: boolean;
};
export function ShippingOrderPanel({ orderId }: { orderId: string }) {
  const [details, setDetails] = useState<ShipmentDetails | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(
    () =>
      fetchAdminPayload<ShipmentDetails>(`shipping-orders?order=${encodeURIComponent(orderId)}`)
        .then(setDetails)
        .catch((e) => setMessage(e.message)),
    [orderId],
  );
  useEffect(() => {
    setDetails(null);
    void refresh();
  }, [refresh]);
  async function runAction(action: string, trackingId?: string) {
    setBusy(true);
    setMessage("");
    try {
      await fetchAdminPayload("shipping-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, orderId, trackingId }),
      });
      setMessage("Shipping action completed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Shipping action failed.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function downloadLabel() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/admin/shipping-label?order=" + encodeURIComponent(orderId),
        { credentials: "same-origin" },
      );
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        let message = "Shipping label could not be downloaded. Please retry or contact support.";
        try {
          const body = await response.json();
          message = body.error || message;
        } catch {
          /* Non-JSON upstream failure. */
        }
        throw new Error(message);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${orderId}-shipping-label.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Shipping label downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Shipping label download failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-4 space-y-2 rounded border p-4">
      <h3 className="font-semibold">Shipment and COD settlement</h3>
      {details ? (
        <>
          <dl>
            {[
              [
                "Shipping status",
                details.shipment["status"] || "Awaiting payment / shipment queue",
              ],
              ["Carrier status", details.shipment["carrier_status"]],
              ["Shipment ID", details.shipment["shipment_id"]],
              ["AWB", details.shipment["awb"]],
              ["Customer shipping charge", details.shipment["shipping_amount"]],
              ["Carrier cost", details.shipment["carrier_cost"]],
              ["Shipping tax", details.shipment["shipping_tax"]],
              ["COD fee", details.shipment["cod_fee"]],
              ["COD collectible", details.shipment["cod_amount"]],
              ["COD settlement", details.shipment["cod_settlement_status"]],
              ["Shipment error", details.shipment["last_error"]],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="inline font-medium">{label}: </dt>
                <dd className="inline">{value ?? "Unavailable"}</dd>
              </div>
            ))}
          </dl>
          {details.events.map((e, i) => (
            <p key={i}>
              {e.status} · {new Date(e.occurred_at).toLocaleString("en-IN")}
            </p>
          ))}
          <p>
            {details.liveEnabled
              ? "Live shipping is enabled by the server operator."
              : "Live shipment creation is disabled. Tracking and labels are available for existing shipments."}
          </p>
          {!details.credentialsConfigured ? (
            <p>Ekart credentials require server configuration.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border p-2"
              disabled={
                busy ||
                !details.liveEnabled ||
                !details.credentialsConfigured ||
                !["QUEUED", "BLOCKED", "FAILED"].includes(String(details.shipment["status"]))
              }
              onClick={() => void runAction("create")}
            >
              Create / retry shipment
            </button>
            {details.shipment["shipment_id"] ? (
              <>
                <button
                  type="button"
                  className="rounded border p-2"
                  disabled={busy}
                  onClick={() => void downloadLabel()}
                >
                  Download shipping label
                </button>
                <button
                  type="button"
                  className="rounded border p-2"
                  disabled={busy}
                  onClick={() => void runAction("sync-tracking")}
                >
                  Sync tracking
                </button>
              </>
            ) : null}
          </div>
          {["UNKNOWN", "PROCESSING"].includes(String(details.shipment["status"])) ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void runAction("reconcile", String(form.get("trackingId")));
              }}
            >
              <p>
                Find the existing tracking ID in the Ekart seller dashboard. Reconciliation verifies
                its order through Ekart without creating another shipment.
              </p>
              <label className="field">
                Confirmed Ekart tracking ID
                <input name="trackingId" required pattern="[A-Za-z0-9-]{1,150}" />
              </label>
              <button className="rounded border p-2" disabled={busy}>
                Reconcile existing shipment
              </button>
            </form>
          ) : null}
          {details.shipment["payment_method"] === "COD" &&
          details.shipment["cod_settlement_status"] === "PENDING" ? (
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const f = new FormData(e.currentTarget);
                try {
                  await fetchAdminPayload("shipping-orders", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      action: "verify-cod",
                      orderId,
                      evidence: f.get("evidence"),
                      amount: Number(f.get("amount")),
                      confirmed: f.get("confirmed") === "on",
                    }),
                  });
                  setMessage("Collection verified.");
                  await refresh();
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Could not verify collection.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                Settlement/evidence reference
                <input name="evidence" minLength={12} maxLength={500} required />
              </label>
              <label className="field">
                Amount collected
                <input name="amount" type="number" step="0.01" required />
              </label>
              <label className="flex gap-2">
                <input name="confirmed" type="checkbox" required />I verified collection against
                settlement evidence.
              </label>
              <button disabled={busy} className="rounded border p-2">
                Verify COD collection
              </button>
            </form>
          ) : null}
        </>
      ) : null}
      <p role="status">{message}</p>
    </section>
  );
}
