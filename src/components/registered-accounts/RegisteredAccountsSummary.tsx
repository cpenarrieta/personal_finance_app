"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    accounts: summary.filter((a) => a.accountType === type),
  })).filter((g) => g.accounts.length > 0)

  const hasBeneficiaries = beneficiaries && beneficiaries.length > 0

  return (
    <div className="space-y-8">
      {grouped.map(({ type, accounts }) => (
        <section key={type} className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={TYPE_BADGE_VARIANT[type]}>{type}</Badge>
            <span className="text-sm text-muted-foreground">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""}
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
              />
            ))}
          </div>
        </section>
      ))}
      {hasBeneficiaries && (
        <div className="flex justify-end">
          <AddAccountDialog />
        </div>
      )}
    </div>
  )
}
