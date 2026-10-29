// Endpoint and payload contract: docs/ekart-openapi.yaml, version 3.8.10.
// Importing this module never contacts Ekart. No credentials are logged or returned.
import { commerceError } from "./_commerce.mjs";

export function ekartConfigured(env = process.env) {
  return ["EKART_CLIENT_ID", "EKART_USERNAME", "EKART_PASSWORD"].every((key) => Boolean(env[key]));
}

export function createEkartClient({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let token,
    tokenExpires = 0,
    authenticating;
  const timeout = 15000;
  function base() {
    const url = new URL(env.EKART_API_BASE_URL || "https://app.elite.ekartlogistics.in");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw commerceError(503, "Ekart API base URL must be an HTTPS origin.");
    return url.origin;
  }
  async function call(path, method, body, authorization, binary = false) {
    let response;
    try {
      response = await fetchImpl(base() + path, {
        method,
        headers: {
          accept: binary ? "application/octet-stream" : "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
          ...(authorization ? { authorization } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout),
        redirect: "error",
      });
    } catch {
      throw Object.assign(
        commerceError(503, "Ekart request timed out or could not be completed."),
        { uncertain: true },
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(
        commerceError(
          response.status === 401 ? 401 : response.status === 429 ? 429 : 502,
          "Ekart rejected the request. Check account configuration or try again later.",
        ),
        {
          carrierStatus: response.status,
          uncertain: response.status >= 500 || response.status === 408,
        },
      );
    }
    const reader = response.body?.getReader();
    if (!reader)
      throw Object.assign(commerceError(502, "Ekart returned an empty response."), {
        uncertain: true,
      });
    let size = 0;
    const chunks = [];
    const limit = binary ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) {
          await reader.cancel();
          throw new Error("limit");
        }
        chunks.push(Buffer.from(value));
      }
    } catch {
      throw Object.assign(
        commerceError(502, "Ekart returned an incomplete or oversized response."),
        { uncertain: true },
      );
    }
    const bytes = Buffer.concat(chunks);
    if (binary) {
      if (bytes.subarray(0, 5).toString() !== "%PDF-")
        throw commerceError(502, "Ekart did not return a PDF shipping label.");
      return bytes;
    }
    try {
      return JSON.parse(bytes.toString("utf8"));
    } catch {
      throw Object.assign(commerceError(502, "Ekart returned an invalid response."), {
        uncertain: true,
      });
    }
  }
  async function accessToken() {
    if (!ekartConfigured(env))
      throw commerceError(503, "Ekart credentials require server configuration.");
    if (token && tokenExpires > now() + 30000) return token;
    authenticating ??= (async () => {
      let data;
      try {
        data = await call(
          `/integrations/v2/auth/token/${encodeURIComponent(env.EKART_CLIENT_ID)}`,
          "POST",
          { username: env.EKART_USERNAME, password: env.EKART_PASSWORD },
        );
      } catch (error) {
        error.stage = "authentication";
        throw error;
      }
      if (
        typeof data?.access_token !== "string" ||
        !data.access_token ||
        data.token_type !== "Bearer" ||
        !Number.isFinite(data.expires_in) ||
        data.expires_in <= 30
      )
        throw commerceError(503, "Ekart authentication response could not be verified.");
      token = "Bearer " + data.access_token;
      tokenExpires = now() + data.expires_in * 1000;
      return token;
    })().finally(() => {
      authenticating = undefined;
    });
    return authenticating;
  }
  async function request(path, method, body, { readOnly = true, binary = false } = {}) {
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      try {
        return await call(path, method, body, await accessToken(), binary);
      } catch (error) {
        if (error.carrierStatus === 401 && error.stage !== "authentication" && !refreshed) {
          token = undefined;
          tokenExpires = 0;
          refreshed = true;
          continue;
        }
        if (readOnly && attempt < 2 && (error.uncertain || error.status === 429)) {
          await pause(200 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
  }
  return {
    configured: () => ekartConfigured(env),
    serviceability: (pin) => request(`/api/v2/serviceability/${encodeURIComponent(pin)}`, "GET"),
    rates: (input) => request("/data/v3/serviceability", "POST", input),
    async create(payload) {
      // Only this method can incur a shipment charge; the gate is checked immediately before I/O.
      if (env.EKART_SHIPPING_ENABLED !== "true")
        throw Object.assign(
          commerceError(
            503,
            "Live Ekart shipment creation is disabled. Explicit approval and server activation are required.",
          ),
          { definiteRejection: true },
        );
      const result = await request("/api/v1/package/create", "PUT", payload, { readOnly: false });
      if (result.status === false)
        throw Object.assign(
          commerceError(
            502,
            "Ekart declined shipment creation. Review the order and account configuration.",
          ),
          { definiteRejection: true },
        );
      if (
        result.status !== true ||
        typeof result.tracking_id !== "string" ||
        !result.tracking_id ||
        typeof result.barcodes?.wbn !== "string" ||
        !result.barcodes.wbn
      )
        throw Object.assign(
          commerceError(502, "Ekart shipment result needs manual reconciliation before retry."),
          { uncertain: true },
        );
      return result;
    },
    label: (trackingId) =>
      request(
        "/api/v1/package/label?json_only=false",
        "POST",
        { ids: [trackingId] },
        { binary: true },
      ),
    track: (trackingId) => request(`/data/v1/elite/track/${encodeURIComponent(trackingId)}`, "GET"),
  };
}

export const ekartClient = createEkartClient();
