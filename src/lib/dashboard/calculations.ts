import { format, eachDayOfInterval } from "date-fns"
import { getTransactionDate, dateToString } from "@/lib/utils/transaction-date"

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

// Types matching our serializable query results
type SerializableAccount = {
  current_balance_number: number | null
}

type SerializableHolding = {
  quantity_number: number | null
  institution_price_number: number | null
}

type SerializableCategory = {
  id: string
  name: string
  imageUrl: string | null
  isTransferCategory: boolean
  created_at_string: string | null
  updated_at_string: string | null
}

type SerializableSubcategory = {
  id: string
  categoryId: string
  name: string
  imageUrl: string | null
  created_at_string: string | null
  updated_at_string: string | null
}

type SerializableTransaction = {
  amount_number: number | null // Display format: negative = expense, positive = income
  datetime: string | null
  category: SerializableCategory | null
  subcategory: SerializableSubcategory | null
}

/**
 * Calculate total balance across all accounts
 */
export function calculateTotalBalance(accounts: SerializableAccount[]): number {
  return accounts.reduce((sum: number, acc) => {
    return sum + (acc.current_balance_number || 0)
  }, 0)
}

/**
 * Calculate total investment value from holdings
 */
export function calculateInvestmentValue(holdings: SerializableHolding[]): number {
  return holdings.reduce((sum: number, holding) => {
    const quantity = holding.quantity_number || 0
    const price = holding.institution_price_number || 0
    return sum + quantity * price
  }, 0)
}

/**
 * Prepare spending by category data for charts
 */
export function prepareSpendingByCategory(transactions: SerializableTransaction[], topN = 10) {
  const categorySpending = transactions
    .filter((t) => {
      const amount = t.amount_number || 0
      return amount < 0 && t.category && !t.category.isTransferCategory
    })
    .reduce(
      (acc: Record<string, number>, t) => {
        const categoryName = t.category?.name || "Uncategorized"
        if (!acc[categoryName]) {
          acc[categoryName] = 0
        }
        acc[categoryName] += Math.abs(t.amount_number || 0)
        return acc
      },
      {} as Record<string, number>,
    )

  return Object.entries(categorySpending)
    .map(([name, value], index) => ({
      name,
      value: value as number,
      color: CHART_COLORS[index % CHART_COLORS.length] as string,
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, topN)
}

/**
 * Prepare spending by subcategory data for charts
 */
export function prepareSpendingBySubcategory(transactions: SerializableTransaction[], topN = 10) {
  const subcategorySpending = transactions
    .filter((t) => {
      const amount = t.amount_number || 0
      return amount < 0 && t.subcategory && t.category && !t.category.isTransferCategory
    })
    .reduce(
      (acc: Record<string, number>, t) => {
        const subcategoryName = t.subcategory?.name || "Other"
        if (!acc[subcategoryName]) {
          acc[subcategoryName] = 0
        }
        acc[subcategoryName] += Math.abs(t.amount_number || 0)
        return acc
      },
      {} as Record<string, number>,
    )

  return Object.entries(subcategorySpending)
    .map(([name, value], index) => ({
      name,
      value: value as number,
      color: CHART_COLORS[index % CHART_COLORS.length] as string,
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, topN)
}

/**
 * Prepare daily spending data for charts
 */
export function prepareDailySpendingData(transactions: SerializableTransaction[], startDate: Date, endDate: Date) {
  const daysInRange = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  return daysInRange.map((day) => {
    const dayStr = dateToString(day)
    const dayTransactions = transactions.filter((t) => {
      if (!t.datetime) return false
      const transactionDateStr = getTransactionDate(t.datetime)
      return transactionDateStr === dayStr
    })

    const spending = dayTransactions
      .filter((t) => {
        const amount = t.amount_number || 0
        return amount < 0 && t.category && !t.category.isTransferCategory
      })
      .reduce((sum: number, t) => sum + Math.abs(t.amount_number || 0), 0)

    return {
      day: format(day, "MMM d"),
      spending,
    }
  })
}
