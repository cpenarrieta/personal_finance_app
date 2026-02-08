"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface OverContributionAlertProps {
  accountType: "RRSP" | "TFSA" | "RESP"
  overContributionAmount: number
  withinBuffer?: boolean
}

export function OverContributionAlert({
  accountType,
  overContributionAmount,
  withinBuffer,
}: OverContributionAlertProps) {
  if (overContributionAmount <= 0 && !withinBuffer) return null

  // RRSP within buffer — soft warning
  if (accountType === "RRSP" && withinBuffer && overContributionAmount <= 0) {
    return (
      <div className="rounded-lg border border-chart-4/30 bg-chart-4/10 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-chart-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-chart-4">Approaching Limit</p>
          <p className="text-sm text-chart-4/80">
            You&apos;re within the $2,000 RRSP over-contribution buffer. Contributions beyond this will incur a 1%
            monthly penalty.
          </p>
        </div>
      </div>
    )
  }

  // Actual over-contribution
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Over-Contribution</AlertTitle>
      <AlertDescription>
        You&apos;ve over-contributed by {formatCurrency(overContributionAmount)}.
        {accountType !== "RESP" && " A 1% monthly penalty applies to the excess amount."}
      </AlertDescription>
    </Alert>
  )
}
