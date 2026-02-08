"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Settings } from "lucide-react"
import { OverContributionAlert } from "./OverContributionAlert"
import { RoomBreakdownCard } from "./RoomBreakdownCard"
import { CESGSummaryCard } from "./CESGSummaryCard"
import { PenaltyTable } from "./PenaltyTable"
import { TransactionTable } from "./TransactionTable"
import { AddTransactionDialog } from "./AddTransactionDialog"
import { EditTransactionDialog } from "./EditTransactionDialog"
import { AccountSettingsSheet } from "./AccountSettingsSheet"
import type { Id } from "../../../convex/_generated/dataModel"

const TYPE_BADGE_VARIANT = {
  RRSP: "soft" as const,
  TFSA: "soft-success" as const,
  RESP: "soft-secondary" as const,
}

interface Transaction {
  id: string
  type: "contribution" | "withdrawal" | "grant"
  amount: number
  date: string
  taxYear: number
  notes: string | null
}

export function AccountDetail({ accountId }: { accountId: string }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const account = useQuery(api.registeredAccounts.getAccountWithRoom, {
    accountId: accountId as Id<"registeredAccounts">,
  })

  const penalties = useQuery(
    api.registeredAccounts.getOverContributionPenalties,
    account && account.accountType !== "RESP" ? { accountId: accountId as Id<"registeredAccounts"> } : "skip",
  )

  if (account === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (account === null) {
    return (
      <div className="space-y-4">
        <Link href="/registered-accounts" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Back to Overview
        </Link>
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const room = account.room as any
  const overAmount = (room.overContributionAmount as number) ?? 0
  const withinBuffer = (room.withinBuffer as boolean) ?? false

  return (
    <div className="space-y-6">
      <Link
        href="/registered-accounts"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Overview
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{account.name}</h1>
          <Badge variant={TYPE_BADGE_VARIANT[account.accountType]}>{account.accountType}</Badge>
          <Badge variant="outline" className="capitalize">
            {account.owner}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4 mr-1" />
          Settings
        </Button>
      </div>

      <OverContributionAlert
        accountType={account.accountType}
        overContributionAmount={overAmount}
        withinBuffer={withinBuffer}
      />

      <RoomBreakdownCard accountType={account.accountType} room={room} />

      {account.accountType === "RESP" && room.cesgSummary && <CESGSummaryCard cesgSummary={room.cesgSummary} />}

      {penalties && penalties.length > 0 && <PenaltyTable penalties={penalties} />}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <AddTransactionDialog accountId={accountId} accountType={account.accountType} />
        </div>
        <TransactionTable transactions={account.transactions} onEdit={setEditingTx} />
      </div>

      <EditTransactionDialog
        transaction={editingTx}
        accountType={account.accountType}
        onClose={() => setEditingTx(null)}
      />

      <AccountSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        account={{
          id: account.id,
          name: account.name,
          accountType: account.accountType,
          roomStartYear: account.roomStartYear,
          beneficiaryId: account.beneficiaryId,
          notes: account.notes,
        }}
      />
    </div>
  )
}
