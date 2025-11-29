// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://42c29480a816371abf39b9addbbedce1@o79776.ingest.us.sentry.io/4510373587451904",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Filter out errors based on environment
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === "development") {
      return null
    }

    // Filter out Next.js internal errors
    if (event.message) {
      // Ignore Next.js internal 500.html errors (App Router uses global-error.tsx)
      if (event.message.includes("Failed to load static file for page: /500")) {
        return null
      }
      // Ignore Next.js static generation bailout errors (expected in dynamic routes)
      if (event.message.includes("NEXT_STATIC_GEN_BAILOUT")) {
        return null
      }
    }

    return event
  },

  // Set environment
  environment: process.env.NODE_ENV || "development",
})
