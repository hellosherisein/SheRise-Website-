export type ConnectionSnapshot = {
  credentialsConfigured: boolean;
  liveEnabled: boolean;
  connection: {
    status:
      | "not-tested"
      | "connected"
      | "serviceability-unconfirmed"
      | "authentication-failed"
      | "request-failed";
    checkedAt: string | null;
    carrierStatus?: number | null;
  };
};
export function createConnectionCheck(options?: {
  client?: { serviceability(pin: string): Promise<{ status?: boolean }> };
  env?: Record<string, string | undefined>;
  now?: () => number;
}): (test?: boolean) => Promise<ConnectionSnapshot>;
export const ekartConnectionCheck: (test?: boolean) => Promise<ConnectionSnapshot>;
