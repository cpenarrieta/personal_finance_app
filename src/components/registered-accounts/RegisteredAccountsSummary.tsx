"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EyeOff } from "lucide-react"
import { EmptyState } from "./EmptyState"
import { AccountSummaryCard } from "./AccountSummaryCard"
import { AddAccountDialog } from "./AddAccountDialog"

const TYPE_ORDER = ["RRSP", "TFSA", "RESP"] as const
const TYPE_BADGE_VARIANT = {
  RRSP: "soft" as const,
  TFSA: "soft-success" as const,
  RESP: "soft-secondary" as const,
}

export function RegisteredAccountsSummary() {
  const summary = useQuery(api.registeredAccounts.getSummary)
  const beneficiaries = useQuery(api.registeredAccounts.getBeneficiaries)
  const [showHidden, setShowHidden] = useState(false)

  if (summary === undefined) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (summary.length === 0) {
    return <EmptyState />
  }

  const hiddenCount = summary.filter((a) => a.isHidden).length

  const grouped = TYPE_ORDER.map((type) => {
    const all = summary.filter((a) => a.accountType === type)
    const visible = showHidden ? all : all.filter((a) => !a.isHidden)
    const hiddenInGroup = all.filter((a) => a.isHidden).length
    return { type, accounts: visible, hiddenInGroup, totalInGroup: all.length }
  }).filter((g) => g.accounts.length > 0 || (showHidden && g.totalInGroup > 0))

  const hasBeneficiaries = beneficiaries && beneficiaries.length > 0

  return (
    <div className="space-y-8">
      {grouped.map(({ type, accounts, hiddenInGroup }) => (
        <section key={type} className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={TYPE_BADGE_VARIANT[type]}>{type}</Badge>
            <span className="text-sm text-muted-foreground">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              {hiddenInGroup > 0 && !showHidden && ` (${hiddenInGroup} hidden)`}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((account) => (
              <AccountSummaryCard
                key={account.id}
                id={account.id}
                name={account.name}
                accountType={account.accountType}
                owner={account.owner}
                beneficiary={account.beneficiary}
                room={account.room}
                isHidden={account.isHidden}
              />
            ))}
          </div>
        </section>
      ))}
      {(hasBeneficiaries || hiddenCount > 0) && (
        <div className="flex items-center justify-end gap-2">
          {hiddenCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHidden(!showHidden)} className="gap-1.5">
              <EyeOff className="h-3.5 w-3.5" />
              {showHidden ? "Hide" : "Show"} {hiddenCount} hidden
            </Button>
          )}
          {hasBeneficiaries && <AddAccountDialog />}
        </div>
      )}
    </div>
  )
}
