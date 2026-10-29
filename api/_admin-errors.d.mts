export function adminErrorResponse(error: unknown): {
  status: number;
  body: { error: string; errorCode?: string };
};
