import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // Adjust this value in production (e.g., 0.1 for 10%)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Filter out errors based on environment
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Optionally disable in development
  enabled: process.env.NODE_ENV === "production",
});
