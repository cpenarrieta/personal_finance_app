/**
 * MCP Query Functions
 * Shared query layer for MCP tools - extracted from transaction-tools.ts
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { getTransactionDate, isTransactionInDateRange, getTransactionMonth } from "@/lib/utils/transaction-date"

// Type for a single transaction from Convex getAll
type Transaction = Awaited<ReturnType<typeof fetchQuery<typeof api.transactions.getAll>>>[number]

// Type for account with institution
type AccountWithInstitution = Awaited<ReturnType<typeof fetchQuery<typeof api.accounts.getAllWithInstitution>>>[number]

/**
 * Fetch all transactions from Convex
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  return fetchQuery(api.transactions.getAll)
}

/**
 * Fetch all accounts with institution info
 */
export async function getAllAccounts(): Promise<AccountWithInstitution[]> {
  return fetchQuery(api.accounts.getAllWithInstitution)
}

/**
 * Filter parameters for transaction queries
 */
interface TransactionFilters {
  categoryName?: string
  merchantName?: string
}

/**
 * Get transactions within a date range with optional filters
 */
export async function getTransactionsInRange(startDate: string, endDate: string, filters?: TransactionFilters) {
  const transactions = await getAllTransactions()

  const filtered = transactions.filter((t) => {
    const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
    const matchesCategory =
      !filters?.categoryName || t.category?.name.toLowerCase().includes(filters.categoryName.toLowerCase())
    const matchesMerchant =
      !filters?.merchantName ||
      (t.merchantName && t.merchantName.toLowerCase().includes(filters.merchantName.toLowerCase()))

    return isInRange && matchesCategory && matchesMerchant
  })

  return filtered.map((t) => ({
    date: getTransactionDate(t.datetime),
    name: t.name,
    merchant: t.merchantName,
    amount: t.amount_number,
    category: t.category?.name,
    subcategory: t.subcategory?.name,
    account: t.account?.name,
    pending: t.pending,
  }))
}

/**
 * Calculate spending grouped by category
 * Only includes expenses (negative amount + groupType === "EXPENSES")
 */
export async function calculateSpendingByCategory(
  startDate: string,
  endDate: string,
  limit = 10,
  sortBy: "amount" | "count" = "amount",
) {
  const transactions = await getAllTransactions()

  const filtered = transactions.filter((t) => {
    const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
    const amount = t.amount_number ?? 0
    const isExpense = amount < 0 && t.category?.groupType === "EXPENSES"
    return isInRange && isExpense
  })

  const categoryMap = new Map<string, { name: string; total: number; count: number }>()

  filtered.forEach((t) => {
    const categoryName = t.category?.name || "Uncategorized"
    const amount = Math.abs(t.amount_number ?? 0)
    const existing = categoryMap.get(categoryName)

    if (existing) {
      existing.total += amount
      existing.count += 1
    } else {
      categoryMap.set(categoryName, {
        name: categoryName,
        total: amount,
        count: 1,
      })
    }
  })

  const categoryData = Array.from(categoryMap.values())
  categoryData.sort((a, b) => {
    if (sortBy === "amount") return b.total - a.total
    return b.count - a.count
  })

  return categoryData.slice(0, limit).map((c) => ({
    category: c.name,
    totalSpent: Number(c.total.toFixed(2)),
    transactionCount: c.count,
    averageTransaction: Number((c.total / c.count).toFixed(2)),
  }))
}

/**
 * Calculate spending grouped by merchant
 * Only includes expenses (negative amount + groupType === "EXPENSES")
 */
export async function calculateSpendingByMerchant(startDate: string, endDate: string, limit = 10) {
  const transactions = await getAllTransactions()

  const filtered = transactions.filter((t) => {
    const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
    const hasMerchant = !!t.merchantName
    const amount = t.amount_number ?? 0
    const isExpense = amount < 0 && t.category?.groupType === "EXPENSES"
    return isInRange && hasMerchant && isExpense
  })

  const merchantMap = new Map<string, { name: string; total: number; count: number }>()

  filtered.forEach((t) => {
    const merchantName = t.merchantName!
    const amount = Math.abs(t.amount_number ?? 0)
    const existing = merchantMap.get(merchantName)

    if (existing) {
      existing.total += amount
      existing.count += 1
    } else {
      merchantMap.set(merchantName, {
        name: merchantName,
        total: amount,
        count: 1,
      })
    }
  })

  const merchantData = Array.from(merchantMap.values())
  merchantData.sort((a, b) => b.total - a.total)

  return merchantData.slice(0, limit).map((m) => ({
    merchant: m.name,
    totalSpent: Number(m.total.toFixed(2)),
    transactionCount: m.count,
    averageTransaction: Number((m.total / m.count).toFixed(2)),
  }))
}

/**
 * Calculate total spending, income, and net for a date range
 */
export async function calculateTotals(startDate: string, endDate: string) {
  const transactions = await getAllTransactions()

  const filtered = transactions.filter((t) => isTransactionInDateRange(t.datetime, startDate, endDate))

  let totalExpenses = 0
  let totalIncome = 0

  filtered.forEach((t) => {
    const amount = t.amount_number ?? 0
    const groupType = t.category?.groupType
    if (amount < 0 && groupType === "EXPENSES") {
      totalExpenses += Math.abs(amount)
    } else if (amount > 0 && groupType === "INCOME") {
      totalIncome += amount
    }
  })

  return {
    totalExpenses: Number(totalExpenses.toFixed(2)),
    totalIncome: Number(totalIncome.toFixed(2)),
    netAmount: Number((totalIncome - totalExpenses).toFixed(2)),
    transactionCount: filtered.length,
    dateRange: { start: startDate, end: endDate },
  }
}

/**
 * Calculate monthly spending trends
 * Only includes expenses (negative amount + groupType === "EXPENSES")
 */
export async function calculateMonthlyTrends(startDate: string, endDate: string, categoryName?: string) {
  const transactions = await getAllTransactions()

  const filtered = transactions.filter((t) => {
    const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
    const matchesCategory = !categoryName || t.category?.name.toLowerCase().includes(categoryName.toLowerCase())
    const amount = t.amount_number ?? 0
    const isExpense = amount < 0 && t.category?.groupType === "EXPENSES"
    return isInRange && matchesCategory && isExpense
  })

  const monthMap = new Map<string, { total: number; count: number }>()

  filtered.forEach((t) => {
    const monthKey = getTransactionMonth(t.datetime)
    const amount = Math.abs(t.amount_number ?? 0)

    const existing = monthMap.get(monthKey)
    if (existing) {
      existing.total += amount
      existing.count += 1
    } else {
      monthMap.set(monthKey, { total: amount, count: 1 })
    }
  })

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      totalSpending: Number(data.total.toFixed(2)),
      transactionCount: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Get account balances with institution info
 */
export async function getAccountBalances() {
  const accounts = await getAllAccounts()

  return accounts.map((a) => ({
    name: a.name,
    type: a.type,
    subtype: a.subtype,
    currentBalance: a.current_balance_number,
    availableBalance: a.available_balance_number,
    creditLimit: a.credit_limit_number,
    institution: a.item?.institution?.name,
    mask: a.mask,
  }))
}
