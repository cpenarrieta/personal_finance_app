import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  integrations: [
    // Session Replay - capture video-like reproductions of user sessions
    Sentry.replayIntegration({
      // Mask all text and images for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // Adjust this value in production (e.g., 0.1 for 10%)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture Replay for 10% of all sessions
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out errors based on environment
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === "development") {
      return null
    }
    return event
  },

  // Set environment
  environment: process.env.NODE_ENV || "development",
})

// Export router transition tracking for Next.js
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
