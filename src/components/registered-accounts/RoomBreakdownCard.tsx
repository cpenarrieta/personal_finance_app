"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoomProgressBar } from "./RoomProgressBar"
import { formatCurrency } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RoomData = any

interface RoomBreakdownCardProps {
  accountType: "RRSP" | "TFSA" | "RESP"
  room: RoomData
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function fmt(val: number | undefined | null): string {
  return formatCurrency(val ?? 0)
}

export function RoomBreakdownCard({ accountType, room }: RoomBreakdownCardProps) {
  const total = room.totalRoom ?? room.deductionLimit ?? room.lifetimeLimit ?? 0
  const used = room.totalContributions ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Room Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RoomProgressBar used={used} total={total} label="Contribution Room" />
        <div className="divide-y">
          {accountType === "TFSA" && (
            <>
              <StatRow label="Total Room" value={fmt(room.totalRoom)} />
              <StatRow label="Total Contributions" value={fmt(room.totalContributions)} />
              <StatRow label="Restored Withdrawals" value={fmt(room.restoredWithdrawals)} />
              <StatRow label="Current Year Withdrawals" value={fmt(room.currentYearWithdrawals)} />
              <StatRow label="Remaining Room" value={fmt(room.remainingRoom)} />
            </>
          )}
          {accountType === "RRSP" && (
            <>
              <StatRow label="Deduction Limit" value={fmt(room.deductionLimit)} />
              <StatRow label="Total Contributions" value={fmt(room.totalContributions)} />
              <StatRow label="Unused Room" value={fmt(room.unusedRoom)} />
              <StatRow label="Remaining Room" value={fmt(room.remainingRoom)} />
            </>
          )}
          {accountType === "RESP" && (
            <>
              <StatRow label="Lifetime Limit" value={fmt(room.lifetimeLimit)} />
              <StatRow label="Total Contributions" value={fmt(room.totalContributions)} />
              <StatRow label="Remaining Room" value={fmt(room.remainingRoom)} />
              <StatRow label="Total Grants" value={fmt(room.totalGrants)} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
