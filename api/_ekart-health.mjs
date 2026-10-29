import { ekartClient, ekartConfigured } from "./_ekart-client.mjs";

// A connection check only authenticates and reads pickup serviceability.
// Never return upstream bodies, credentials or tokens to the browser.
export function createConnectionCheck({
  client = ekartClient,
  env = process.env,
  now = Date.now,
} = {}) {
  let result, pending;
  const snapshot = () => ({
    credentialsConfigured: ekartConfigured(env),
    liveEnabled: env.EKART_SHIPPING_ENABLED === "true",
    connection: result || { status: "not-tested", checkedAt: null },
  });
  return async function connectionCheck(test = false) {
    if (!test || !ekartConfigured(env)) return snapshot();
    if (result && now() - Date.parse(result.checkedAt) < 60000) return snapshot();
    pending ??= (async () => {
      try {
        const data = await client.serviceability("400013");
        result = {
          status: data?.status === true ? "connected" : "serviceability-unconfirmed",
          checkedAt: new Date(now()).toISOString(),
        };
      } catch (error) {
        result = {
          status: error.stage === "authentication" ? "authentication-failed" : "request-failed",
          checkedAt: new Date(now()).toISOString(),
          carrierStatus: Number.isInteger(error.carrierStatus) ? error.carrierStatus : null,
        };
      }
    })().finally(() => {
      pending = undefined;
    });
    await pending;
    return snapshot();
  };
}

export const ekartConnectionCheck = createConnectionCheck();
