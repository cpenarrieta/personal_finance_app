import { fetchQuery } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { startOfMonth as dateStartOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { cacheTag, cacheLife } from "next/cache"

/**
 * Get dashboard metrics (accounts and holdings)
 * Fetches accounts with balances and all holdings in parallel
 */
export async function getDashboardMetrics() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("accounts", "holdings", "dashboard")

  const result = await fetchQuery(api.dashboard.getMetrics, {})
  return result
}

/**
 * Get uncategorized transactions count and data
 */
export async function getUncategorizedTransactions() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions", "dashboard")

  const result = await fetchQuery(api.transactions.getUncategorized, {})
  return result
}

/**
 * Get count of transactions that need review
 * Includes both uncategorized transactions AND transactions with "for-review" tag
 */
export async function getReviewTransactionsCount() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions", "dashboard", "tags")

  const count = await fetchQuery(api.dashboard.getReviewCount, {})
  return count
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit = 20) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions", "dashboard")

  const result = await fetchQuery(api.transactions.getRecentForDashboard, { limit })
  return result
}

/**
 * Get date range for the last N full months (timezone-agnostic)
 * @param monthsBack Number of full months to go back (0 = current month, 1, 2, 3, or 6)
 * @returns Start and end dates as YYYY-MM-DD strings
 */
export function getLastMonthDateRange(monthsBack: number = 0) {
  const now = new Date()

  if (monthsBack === 0) {
    // Current month: from start of current month to today
    const periodStart = dateStartOfMonth(now)
    const periodEnd = now
    return {
      lastMonthStart: format(periodStart, "yyyy-MM-dd"),
      lastMonthEnd: format(periodEnd, "yyyy-MM-dd"),
    }
  }

  // Last N full months: from beginning of N months ago to end of last month
  const periodStart = dateStartOfMonth(subMonths(now, monthsBack))
  const periodEnd = endOfMonth(subMonths(now, 1))

  return {
    lastMonthStart: format(periodStart, "yyyy-MM-dd"),
    lastMonthEnd: format(periodEnd, "yyyy-MM-dd"),
  }
}

/**
 * Get statistics for the last N full months (spending, income, and transactions)
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 */
export async function getLastMonthStats(monthsBack: number = 0) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions", "dashboard")

  const result = await fetchQuery(api.dashboard.getLastMonthStats, { monthsBack })
  return result
}

/**
 * Get top expensive transactions from the last N full months
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 * @param limit Maximum number of transactions to return
 */
export async function getTopExpensiveTransactions(monthsBack: number = 0, limit = 25) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions", "dashboard")

  const result = await fetchQuery(api.dashboard.getTopExpensiveTransactions, {
    monthsBack,
    limit,
  })
  return result
}

/**
 * Check if user has any connected Plaid items
 */
export async function hasConnectedAccounts() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("accounts")

  const hasItems = await fetchQuery(api.dashboard.hasConnectedItems, {})
  return hasItems
}

/**
 * Get stats with trends comparing current period to previous period
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 */
export async function getStatsWithTrends(monthsBack: number = 0) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions", "dashboard")

  const result = await fetchQuery(api.dashboard.getStatsWithTrends, { monthsBack })
  return result
}
