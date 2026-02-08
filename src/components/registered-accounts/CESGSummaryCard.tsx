"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface CESGSummaryCardProps {
  cesgSummary: {
    totalCESGReceived: number
    lifetimeMax: number
    remainingLifetimeCESG: number
    currentYearCESG: number
    currentYearMax: number
    carryForwardRoom: number
    eligibleForCESG: boolean
  }
}

export function CESGSummaryCard({ cesgSummary }: CESGSummaryCardProps) {
  const s = cesgSummary

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">CESG Summary</CardTitle>
          {!s.eligibleForCESG && <Badge variant="soft-secondary">Not Eligible</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Total CESG Received</span>
            <span className="text-sm font-medium">{formatCurrency(s.totalCESGReceived)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Lifetime Max</span>
            <span className="text-sm font-medium">{formatCurrency(s.lifetimeMax)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Remaining Lifetime CESG</span>
            <span className="text-sm font-medium">{formatCurrency(s.remainingLifetimeCESG)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Current Year CESG</span>
            <span className="text-sm font-medium">{formatCurrency(s.currentYearCESG)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Current Year Max</span>
            <span className="text-sm font-medium">{formatCurrency(s.currentYearMax)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Carry-Forward Room</span>
            <span className="text-sm font-medium">{formatCurrency(s.carryForwardRoom)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
