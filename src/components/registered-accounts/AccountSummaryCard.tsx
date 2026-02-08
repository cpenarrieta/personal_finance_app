"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RoomProgressBar } from "./RoomProgressBar"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

type AccountType = "RRSP" | "TFSA" | "RESP"

interface AccountSummaryCardProps {
  id: string
  name: string
  accountType: AccountType
  owner: "self" | "spouse"
  beneficiary?: { name: string } | null
  room: {
    totalContributions: number
    remainingRoom: number
    overContributionAmount: number
    // TFSA
    totalRoom?: number
    // RRSP
    deductionLimit?: number
    withinBuffer?: boolean
    // RESP
    lifetimeLimit?: number
    totalGrants?: number
    cesgSummary?: { totalCESGReceived: number; lifetimeMax: number }
  }
}

const typeBadgeVariant: Record<AccountType, "soft" | "soft-success" | "soft-secondary"> = {
  RRSP: "soft",
  TFSA: "soft-success",
  RESP: "soft-secondary",
}

export function AccountSummaryCard({ id, name, accountType, owner, beneficiary, room }: AccountSummaryCardProps) {
  const total = room.totalRoom ?? room.deductionLimit ?? room.lifetimeLimit ?? 0
  const used = room.totalContributions
  const isOver = room.overContributionAmount > 0
  const isBuffer = accountType === "RRSP" && room.withinBuffer

  return (
    <Link href={`/registered-accounts/${id}`}>
      <Card
        className={cn(
          "transition-colors hover:bg-accent/50 cursor-pointer",
          isOver && "border-destructive/50",
          isBuffer && !isOver && "border-chart-4/50",
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium truncate">{name}</CardTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant={typeBadgeVariant[accountType]}>{accountType}</Badge>
              <Badge variant="outline" className="capitalize">
                {owner}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <RoomProgressBar used={used} total={total} />
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{formatCurrency(room.remainingRoom)}</span>
            <span className="text-xs text-muted-foreground">remaining</span>
          </div>
          {isOver && <Badge variant="soft-destructive">Over by {formatCurrency(room.overContributionAmount)}</Badge>}
          {isBuffer && !isOver && <p className="text-xs text-chart-4">Within $2,000 buffer</p>}
          {accountType === "RESP" && room.cesgSummary && (
            <p className="text-xs text-muted-foreground">
              CESG: {formatCurrency(room.cesgSummary.totalCESGReceived)} /{" "}
              {formatCurrency(room.cesgSummary.lifetimeMax)}
            </p>
          )}
          {beneficiary && <p className="text-xs text-muted-foreground">Beneficiary: {beneficiary.name}</p>}
        </CardContent>
      </Card>
    </Link>
  )
}
