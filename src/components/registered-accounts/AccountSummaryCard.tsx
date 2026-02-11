"use client"

import Link from "next/link"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RoomProgressBar } from "./RoomProgressBar"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"
import type { Id } from "../../../convex/_generated/dataModel"

type AccountType = "RRSP" | "TFSA" | "RESP"

interface AccountSummaryCardProps {
  id: string
  name: string
  accountType: AccountType
  owner: "self" | "spouse"
  beneficiary?: { name: string } | null
  isHidden?: boolean
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

export function AccountSummaryCard({
  id,
  name,
  accountType,
  owner,
  beneficiary,
  room,
  isHidden,
}: AccountSummaryCardProps) {
  const toggleVisibility = useMutation(api.registeredAccounts.toggleAccountVisibility)
  const total = room.totalRoom ?? room.deductionLimit ?? room.lifetimeLimit ?? 0
  const used = room.totalContributions
  const isOver = room.overContributionAmount > 0
  const isBuffer = accountType === "RRSP" && room.withinBuffer

  return (
    <Link href={`/registered-accounts/${id}`}>
      <Card
        className={cn(
          "group relative transition-colors hover:bg-accent/50 cursor-pointer",
          isOver && "border-destructive/50",
          isBuffer && !isOver && "border-chart-4/50",
          isHidden && "opacity-50 border-dashed",
        )}
      >
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleVisibility({ id: id as Id<"registeredAccounts"> })
          }}
          className={cn(
            "absolute top-2 left-2 z-10 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-opacity",
            isHidden ? "opacity-100" : "opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100",
          )}
          title={isHidden ? "Show account" : "Hide account"}
        >
          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
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
