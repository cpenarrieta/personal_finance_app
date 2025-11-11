"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

/**
 * Error boundary for all pages in the (app) route group
 * Catches errors during rendering, data fetching, or Server Component execution
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log error to console in development
    console.error("Error caught by error boundary:", error)

    // Report error to Sentry
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error)
    })
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="font-mono text-sm break-words">{error.message || "An unexpected error occurred"}</p>
              {error.digest && <p className="text-xs text-muted-foreground mt-2">Error ID: {error.digest}</p>}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Go to dashboard
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>If this problem persists, please try:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Refreshing the page</li>
              <li>Clearing your browser cache</li>
              <li>Checking your internet connection</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
