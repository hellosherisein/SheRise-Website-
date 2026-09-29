export function createServerFn(_options?: unknown) {
  const api = {
    validator: () => api,
    handler: <T extends (args?: { data?: unknown }) => unknown>(fn: T) => {
      return (args?: { data?: unknown }) => fn(args);
    },
  };
  return api;
}

export function createStart(fn: unknown) {
  return fn;
}

export function createCsrfMiddleware(options?: unknown) {
  return options;
}

export function createMiddleware() {
  return {
    server: (fn: unknown) => fn,
  };
}
