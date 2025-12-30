import { useState, useMemo } from "react"
import type { TransactionForClient } from "@/types"
import { compareTransactionDates } from "@/lib/utils/transaction-date"

export type SortField = "createdAt" | "date" | "amount" | "name" | "merchant" | "category"
export type SortDirection = "asc" | "desc"

interface UseTransactionSortConfig {
  defaultSortBy?: SortField
  defaultSortDirection?: SortDirection
}

export function useTransactionSort({
  defaultSortBy = "date",
  defaultSortDirection = "desc",
}: UseTransactionSortConfig = {}) {
  const [sortBy, setSortBy] = useState<SortField>(defaultSortBy)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection)

  // Sort transactions
  const sortTransactions = useMemo(() => {
    return (transactions: TransactionForClient[]) => {
      return [...transactions].sort((a, b) => {
        let compareValue = 0

        switch (sortBy) {
          case "createdAt":
            compareValue = new Date(a.created_at_string ?? 0).getTime() - new Date(b.created_at_string ?? 0).getTime()
            break
          case "date":
            compareValue = compareTransactionDates(a.datetime, b.datetime)
            break
          case "amount":
            compareValue = a.amount_number - b.amount_number
            break
          case "name":
            compareValue = a.name.localeCompare(b.name)
            break
          case "merchant":
            compareValue = (a.merchantName || "").localeCompare(b.merchantName || "")
            break
          case "category":
            compareValue = (a.category?.name || "").localeCompare(b.category?.name || "")
            break
        }

        return sortDirection === "asc" ? compareValue : -compareValue
      })
    }
  }, [sortBy, sortDirection])

  // Toggle sort (if same field, toggle direction; if new field, use desc)
  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDirection("desc")
    }
  }

  return {
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    sortTransactions,
    toggleSort,
  }
}
