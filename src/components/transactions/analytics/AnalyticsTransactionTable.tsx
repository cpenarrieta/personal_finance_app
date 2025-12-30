"use client"

import Image from "next/image"
import { TransactionForClient } from "@/types/client"
import { formatTransactionDate } from "@/lib/utils/transaction-date"

interface AnalyticsTransactionTableProps {
  transactions: TransactionForClient[]
  sortBy: "date" | "amount" | "category"
  sortOrder: "asc" | "desc"
  onToggleSort: (field: "date" | "amount" | "category") => void
}

/**
 * Transaction details table with sortable columns
 */
export function AnalyticsTransactionTable({
  transactions,
  sortBy,
  sortOrder,
  onToggleSort,
}: AnalyticsTransactionTableProps) {
  const getSortIndicator = (field: "date" | "amount" | "category") => {
    if (sortBy === field) {
      return sortOrder === "asc" ? "↑" : "↓"
    }
    return ""
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Transaction Details</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Showing {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th
                onClick={() => onToggleSort("date")}
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
              >
                Date {getSortIndicator("date")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th
                onClick={() => onToggleSort("category")}
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
              >
                Category {getSortIndicator("category")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Subcategory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Account
              </th>
              <th
                onClick={() => onToggleSort("amount")}
                className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
              >
                Amount {getSortIndicator("amount")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => (window.location.href = `/transactions/${transaction.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatTransactionDate(transaction.datetime, "medium")}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    {transaction.logoUrl && (
                      <Image
                        src={transaction.logoUrl}
                        alt=""
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div>
                      <div className="font-medium hover:text-primary">{transaction.name}</div>
                      {transaction.merchantName && (
                        <div className="text-xs text-muted-foreground">{transaction.merchantName}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    {transaction.category?.imageUrl && (
                      <Image
                        src={transaction.category.imageUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded"
                      />
                    )}
                    <span className="text-foreground">{transaction.category?.name || "Uncategorized"}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {transaction.subcategory?.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {transaction.account?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    className={
                      transaction.amount_number < 0 ? "text-destructive font-medium" : "text-success font-medium"
                    }
                  >
                    {transaction.amount_number < 0 ? "-" : "+"}$
                    {Math.abs(transaction.amount_number).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No transactions found matching the selected filters.
        </div>
      )}
    </div>
  )
}
