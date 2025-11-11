"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

/**
 * Error boundary for transactions page
 * Catches errors during data fetching or rendering
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Transactions page error:", error)

    // Report error to Sentry
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: { page: "transactions" },
      })
    })
  }, [error])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Banking Transactions</h1>
        <p className="text-muted-foreground mt-1">View and search all your banking transactions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Failed to load transactions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message || "Unable to fetch transaction data"}</AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Back to dashboard
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            This could be due to a temporary database issue or connectivity problem. If the error persists, try
            refreshing the page or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
