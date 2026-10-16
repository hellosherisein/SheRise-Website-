export function createAdminCookie(): string;
export function clearAdminCookie(): string;
export function assertAdminRequest(request: { headers: { cookie?: string } }): void;
export function unauthorized(): Error & { statusCode: number };
export const defaultAdminEmail: string;
export const defaultAdminPasswordHash: string;
export function requireSessionSecret(): string;
