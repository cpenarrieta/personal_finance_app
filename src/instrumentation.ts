export async function register() {
  // This function is called when a new Next.js server instance is initiated
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side instrumentation
    await import("../sentry.server.config")
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path: string
    method: string
    headers: Headers
  },
  context: {
    routerKind: "Pages Router" | "App Router"
    routePath: string
    routeType: "render" | "route" | "action" | "middleware"
  },
) {
  // Don't send errors in development
  if (process.env.NODE_ENV === "development") {
    return
  }

  // Track server errors to Sentry
  const { captureException } = await import("@sentry/nextjs")

  captureException(err, {
    tags: {
      route: context.routePath,
      routerKind: context.routerKind,
      routeType: context.routeType,
      path: request.path,
      method: request.method,
    },
  })
}
