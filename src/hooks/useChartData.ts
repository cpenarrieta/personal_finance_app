import { useMemo } from "react"
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns"
import type { TransactionForClient } from "@/types"
import {
  isTransactionInDateRange,
  getTransactionMonth,
  formatTransactionMonth,
  dateToString,
} from "@/lib/utils/transaction-date"

export interface SubcategoryDataItem {
  name: string
  value: number
  imageUrl?: string
  categoryName?: string
}

export interface CategoryDataItem {
  name: string
  value: number
  imageUrl?: string
}

export interface MonthlyComparisonDataItem {
  month: string
  expenses: number
  income: number
  net: number
}

export interface SpendingTrendsDataItem {
  month: string
  amount: number
}

export interface IncomeVsExpensesDataItem {
  name: string
  value: number
}

interface UseChartDataParams {
  transactions: TransactionForClient[]
  filteredTransactions: TransactionForClient[]
}

export function useChartData({ transactions, filteredTransactions }: UseChartDataParams) {
  // Subcategory breakdown data
  const subcategoryData = useMemo(() => {
    const subcategoryMap = new Map<string, SubcategoryDataItem>()

    filteredTransactions.forEach((t) => {
      const amount = Math.abs(t.amount_number ?? 0)
      const subcategoryName = t.subcategory?.name || "No Subcategory"
      const imageUrl = t.subcategory?.imageUrl
      const categoryName = t.subcategory?.category?.name || t.category?.name || "Uncategorized"

      if (subcategoryMap.has(subcategoryName)) {
        subcategoryMap.get(subcategoryName)!.value += amount
      } else {
        subcategoryMap.set(subcategoryName, {
          name: subcategoryName,
          value: amount,
          imageUrl: imageUrl || undefined,
          categoryName,
        })
      }
    })

    return Array.from(subcategoryMap.values()).sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

  // Category breakdown data
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, CategoryDataItem>()

    filteredTransactions.forEach((t) => {
      const amount = Math.abs(t.amount_number ?? 0)
      const categoryName = t.category?.name || "Uncategorized"
      const imageUrl = t.category?.imageUrl

      if (categoryMap.has(categoryName)) {
        categoryMap.get(categoryName)!.value += amount
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          value: amount,
          imageUrl: imageUrl || undefined,
        })
      }
    })

    return Array.from(categoryMap.values()).sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

  // Monthly comparison data (last 12 months, uses all transactions, not filtered)
  const monthlyComparisonData = useMemo(() => {
    const now = new Date()
    const startDate = subMonths(startOfMonth(now), 11)
    const months = eachMonthOfInterval({ start: startDate, end: now })

    return months.map((month) => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const startStr = dateToString(monthStart)
      const endStr = dateToString(monthEnd)

      const monthTransactions = transactions.filter((t) =>
        isTransactionInDateRange(t.datetime, startStr, endStr)
      )

      const expenses = Math.abs(
        monthTransactions
          .filter((t) => t.amount_number < 0)
          .reduce((sum, t) => sum + (t.amount_number ?? 0), 0)
      )

      const income = monthTransactions
        .filter((t) => t.amount_number > 0)
        .reduce((sum, t) => sum + (t.amount_number ?? 0), 0)

      return {
        month: format(month, "MMM yyyy"),
        expenses,
        income,
        net: income - expenses,
      }
    })
  }, [transactions])

  // Spending trends data
  const spendingTrendsData = useMemo(() => {
    const monthMap = new Map<string, number>()

    filteredTransactions.forEach((t) => {
      const monthKey = getTransactionMonth(t.datetime)
      const amount = Math.abs(t.amount_number ?? 0)

      if (monthMap.has(monthKey)) {
        monthMap.set(monthKey, monthMap.get(monthKey)! + amount)
      } else {
        monthMap.set(monthKey, amount)
      }
    })

    return Array.from(monthMap.entries())
      .map(([monthKey, amount]) => ({ month: formatTransactionMonth(monthKey), amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [filteredTransactions])

  // Income vs Expenses summary data
  const incomeVsExpensesData = useMemo(() => {
    const expenses = Math.abs(
      filteredTransactions
        .filter((t) => t.amount_number < 0)
        .reduce((sum, t) => sum + (t.amount_number ?? 0), 0)
    )

    const income = filteredTransactions
      .filter((t) => t.amount_number > 0)
      .reduce((sum, t) => sum + (t.amount_number ?? 0), 0)

    return [
      { name: "Income", value: income },
      { name: "Expenses", value: expenses },
      { name: "Net", value: income - expenses },
    ]
  }, [filteredTransactions])

  return {
    subcategoryData,
    categoryData,
    monthlyComparisonData,
    spendingTrendsData,
    incomeVsExpensesData,
  }
}
