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

// Colors for Sankey chart
const INCOME_COLOR = "#22c55e" // green-500
// Gradient colors for expenses (biggest to smallest)
const EXPENSE_GRADIENT = [
  "#dc2626", // red-600 (biggest)
  "#f97316", // orange-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#f472b6", // pink-400
  "#a855f7", // purple-500
  "#64748b", // slate-500
  "#78716c", // stone-500
  "#71717a", // zinc-500
]
const UNCATEGORIZED_COLOR = "#6b7280" // gray-500
const SURPLUS_COLOR = "#22c55e" // green-500

function getExpenseColor(index: number): string {
  return EXPENSE_GRADIENT[index % EXPENSE_GRADIENT.length] || "#64748b"
}

export type SankeyNode = {
  name: string
  color?: string
}

export type SankeyLink = {
  source: number
  target: number
  value: number
  color?: string
}

export type SankeyData = {
  nodes: SankeyNode[]
  links: SankeyLink[]
  totalIncome: number
  totalExpenses: number
  surplus: number
}

/**
 * Prepare cashflow Sankey chart data
 * Structure: Income sources → Cash Flow → Expense categories + Surplus
 */
export function prepareCashflowSankeyData(transactions: SerializableTransaction[]): SankeyData {
  // Calculate income by category
  const incomeByCategory: Record<string, number> = {}
  let uncategorizedIncome = 0

  // Calculate expenses by category
  const expensesByCategory: Record<string, number> = {}
  let uncategorizedExpenses = 0

  transactions.forEach((t) => {
    const amount = t.amount_number || 0
    const isTransfer = t.category?.isTransferCategory

    if (isTransfer) return // Skip transfers

    if (amount > 0) {
      // Income (positive in display format)
      const categoryName = t.category?.name
      if (categoryName) {
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + amount
      } else {
        uncategorizedIncome += amount
      }
    } else if (amount < 0) {
      // Expense (negative in display format)
      const categoryName = t.category?.name
      if (categoryName) {
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Math.abs(amount)
      } else {
        uncategorizedExpenses += Math.abs(amount)
      }
    }
  })

  // Build nodes array
  const nodes: SankeyNode[] = []
  const nodeIndexMap: Record<string, number> = {}

  // Add income nodes (left side)
  const incomeCategories = Object.entries(incomeByCategory)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])

  incomeCategories.forEach(([name]) => {
    nodeIndexMap[`income_${name}`] = nodes.length
    nodes.push({ name, color: INCOME_COLOR })
  })

  if (uncategorizedIncome > 0) {
    nodeIndexMap["income_Uncategorized"] = nodes.length
    nodes.push({ name: "Uncategorized", color: UNCATEGORIZED_COLOR })
  }

  // Add Cash Flow node (center)
  const cashFlowIndex = nodes.length
  nodeIndexMap["cashflow"] = cashFlowIndex
  nodes.push({ name: "Cash Flow", color: INCOME_COLOR })

  // Add expense nodes (right side) - sorted by amount, colors based on rank
  const expenseCategories = Object.entries(expensesByCategory)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])

  // Store expense colors by name for links
  const expenseColorMap: Record<string, string> = {}
  expenseCategories.forEach(([name], index) => {
    const color = getExpenseColor(index)
    expenseColorMap[name] = color
    nodeIndexMap[`expense_${name}`] = nodes.length
    nodes.push({ name, color })
  })

  if (uncategorizedExpenses > 0) {
    nodeIndexMap["expense_Uncategorized"] = nodes.length
    nodes.push({ name: "Uncategorized", color: UNCATEGORIZED_COLOR })
  }

  // Calculate totals
  const totalIncome = incomeCategories.reduce((sum, [, value]) => sum + value, 0) + uncategorizedIncome
  const totalExpenses = expenseCategories.reduce((sum, [, value]) => sum + value, 0) + uncategorizedExpenses
  const surplus = totalIncome - totalExpenses

  // Add Surplus node LAST so it appears at the bottom
  if (surplus > 0) {
    nodeIndexMap["surplus"] = nodes.length
    nodes.push({ name: "Surplus", color: SURPLUS_COLOR })
  }

  // Build links array
  const links: SankeyLink[] = []

  // Links from income to Cash Flow
  incomeCategories.forEach(([name, value]) => {
    const sourceIndex = nodeIndexMap[`income_${name}`]
    if (sourceIndex !== undefined) {
      links.push({
        source: sourceIndex,
        target: cashFlowIndex,
        value,
        color: INCOME_COLOR,
      })
    }
  })

  if (uncategorizedIncome > 0) {
    const sourceIndex = nodeIndexMap["income_Uncategorized"]
    if (sourceIndex !== undefined) {
      links.push({
        source: sourceIndex,
        target: cashFlowIndex,
        value: uncategorizedIncome,
        color: UNCATEGORIZED_COLOR,
      })
    }
  }

  // Links from Cash Flow to expenses
  expenseCategories.forEach(([name, value]) => {
    const targetIndex = nodeIndexMap[`expense_${name}`]
    if (targetIndex !== undefined) {
      links.push({
        source: cashFlowIndex,
        target: targetIndex,
        value,
        color: expenseColorMap[name],
      })
    }
  })

  if (uncategorizedExpenses > 0) {
    const targetIndex = nodeIndexMap["expense_Uncategorized"]
    if (targetIndex !== undefined) {
      links.push({
        source: cashFlowIndex,
        target: targetIndex,
        value: uncategorizedExpenses,
        color: UNCATEGORIZED_COLOR,
      })
    }
  }

  // Link from Cash Flow to Surplus
  if (surplus > 0) {
    const targetIndex = nodeIndexMap["surplus"]
    if (targetIndex !== undefined) {
      links.push({
        source: cashFlowIndex,
        target: targetIndex,
        value: surplus,
        color: SURPLUS_COLOR,
      })
    }
  }

  return {
    nodes,
    links,
    totalIncome,
    totalExpenses,
    surplus,
  }
}

/**
 * Prepare daily spending data for charts
 */
export function prepareDailySpendingData(
  transactions: SerializableTransaction[],
  startDate: Date | string,
  endDate: Date | string,
) {
  // Convert string dates to Date objects if necessary
  const start = typeof startDate === "string" ? new Date(startDate) : startDate
  const end = typeof endDate === "string" ? new Date(endDate) : endDate

  const daysInRange = eachDayOfInterval({
    start,
    end,
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
