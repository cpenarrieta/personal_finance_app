"use client"

import { formatAmount } from "@/lib/utils"

interface AnalyticsSummaryStatsProps {
  count: number
  totalExpenses: number
  totalIncome: number
  avgTransaction: number
}

/**
 * Summary statistics cards for transaction analytics
 */
export function AnalyticsSummaryStats({
  count,
  totalExpenses,
  totalIncome,
  avgTransaction,
}: AnalyticsSummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <div className="text-sm text-muted-foreground mb-1">Total Transactions</div>
        <div className="text-3xl font-bold text-foreground">{count}</div>
      </div>
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
        <div className="text-3xl font-bold text-destructive">${formatAmount(totalExpenses)}</div>
      </div>
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <div className="text-sm text-muted-foreground mb-1">Total Income</div>
        <div className="text-3xl font-bold text-success">${formatAmount(totalIncome)}</div>
      </div>
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <div className="text-sm text-muted-foreground mb-1">Avg Transaction</div>
        <div className="text-3xl font-bold text-foreground">${formatAmount(avgTransaction)}</div>
      </div>
    </div>
  )
}
