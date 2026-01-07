"use client"

import { formatAmount } from "@/lib/utils"

interface TransactionTotals {
  income: number
  expenses: number
  netBalance: number
  count: number
}

interface TransactionSummaryCardsProps {
  totals: TransactionTotals
}

/**
 * Summary cards showing income, expenses, and net balance for filtered transactions
 */
export function TransactionSummaryCards({ totals }: TransactionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      <div className="bg-gradient-to-br from-success/5 to-transparent p-3 md:p-4 rounded-xl border border-success/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-xs md:text-sm font-medium text-muted-foreground">Income</span>
        </div>
        <div className="text-lg md:text-2xl font-bold text-success">
          +${formatAmount(totals.income)}
        </div>
      </div>

      <div className="bg-gradient-to-br from-destructive/5 to-transparent p-3 md:p-4 rounded-xl border border-destructive/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-xs md:text-sm font-medium text-muted-foreground">Expenses</span>
        </div>
        <div className="text-lg md:text-2xl font-bold text-destructive">
          -${formatAmount(totals.expenses)}
        </div>
      </div>

      <div className={`bg-gradient-to-br p-3 md:p-4 rounded-xl border ${
        totals.netBalance >= 0
          ? "from-success/5 to-transparent border-success/20"
          : "from-destructive/5 to-transparent border-destructive/20"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`h-2 w-2 rounded-full ${totals.netBalance >= 0 ? "bg-success" : "bg-destructive"}`} />
          <span className="text-xs md:text-sm font-medium text-muted-foreground">Net</span>
        </div>
        <div className={`text-lg md:text-2xl font-bold ${totals.netBalance >= 0 ? "text-success" : "text-destructive"}`}>
          {totals.netBalance >= 0 ? "+" : "-"}${formatAmount(Math.abs(totals.netBalance))}
        </div>
      </div>
    </div>
  )
}
