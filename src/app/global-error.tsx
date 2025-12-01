"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { logError } from "@/lib/utils/logger"

/**
 * Global error boundary that wraps the entire application
 * Only catches errors in the root layout
 * Must include <html> and <body> tags
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log error using logger utility (logs to console and Sentry in production)
    logError("Global error caught:", error)

    // Report error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              padding: "40px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
            }}
          >
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "16px",
                color: "#dc2626",
              }}
            >
              Something went wrong!
            </h1>

            <p
              style={{
                marginBottom: "20px",
                color: "#4b5563",
              }}
            >
              A critical error occurred. Our team has been notified and we&apos;re working to fix it.
            </p>

            {error.message && (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  color: "#991b1b",
                  wordBreak: "break-word",
                }}
              >
                {error.message}
              </div>
            )}

            {error.digest && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "20px",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={reset}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Try again
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
