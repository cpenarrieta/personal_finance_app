"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { logError } from "@/lib/utils/logger"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("Accounts page error:", error, { page: "accounts" })

    // Report error to Sentry
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: { page: "accounts" },
      })
    })
  }, [error])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Accounts</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Failed to load accounts</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message || "Unable to fetch accounts"}</AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
