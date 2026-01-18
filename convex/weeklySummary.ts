// convex/weeklySummary.ts
// Weekly summary queries and mutations

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number | undefined | null): string | null {
  if (!ts) return null
  return new Date(ts).toISOString()
}

/**
 * Get the most recent weekly summary
 */
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const summaries = await ctx.db.query("weeklySummaries").withIndex("by_generatedAt").order("desc").first()

    if (!summaries) return null

    return {
      id: summaries._id,
      summary: summaries.summary,
      generated_at_string: formatTimestamp(summaries.generatedAt),
    }
  },
})

/**
 * Create a new weekly summary
 */
export const create = mutation({
  args: { summary: v.string() },
  handler: async (ctx, { summary }) => {
    const now = Date.now()
    const id = await ctx.db.insert("weeklySummaries", {
      summary,
      generatedAt: now,
    })
    return id
  },
})

/**
 * Aggregate financial data for last 6 months (for executive summary)
 */
export const aggregateFinancialData = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0] ?? ""

    // Get all transactions
    const allTransactions = await ctx.db.query("transactions").collect()

    // Filter non-split transactions in date range
    const transactions = allTransactions.filter((tx) => {
      if (tx.isSplit) return false
      const txDate = tx.datetime.split("T")[0] ?? ""
      return txDate >= sixMonthsAgoStr
    })

    // Get all categories
    const categories = await ctx.db.query("categories").collect()
    const categoryMap = new Map(categories.map((c) => [c._id, c]))

    // Filter out TRANSFER transactions for spending/income calculations
    const nonTransferTxs = await Promise.all(
      transactions.map(async (tx) => {
        if (!tx.categoryId) return { tx, isTransfer: false }
        const category = categoryMap.get(tx.categoryId)
        return { tx, isTransfer: category?.groupType === "TRANSFER" }
      }),
    )
    const filteredTxs = nonTransferTxs.filter((t) => !t.isTransfer).map((t) => t.tx)

    // Calculate totals
    let totalSpending = 0
    let totalIncome = 0
    for (const tx of filteredTxs) {
      if (tx.amount < 0) {
        totalSpending += Math.abs(tx.amount)
      } else {
        totalIncome += tx.amount
      }
    }

    // Spending by category
    const spendingByCategory: Record<string, { name: string; amount: number }> = {}
    for (const tx of filteredTxs) {
      if (tx.amount >= 0) continue // Only expenses
      const categoryId = tx.categoryId
      const categoryName = categoryId ? categoryMap.get(categoryId)?.name || "Uncategorized" : "Uncategorized"

      if (!spendingByCategory[categoryName]) {
        spendingByCategory[categoryName] = { name: categoryName, amount: 0 }
      }
      spendingByCategory[categoryName].amount += Math.abs(tx.amount)
    }
    const categoryList = Object.values(spendingByCategory)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((c) => ({
        ...c,
        percent: totalSpending > 0 ? (c.amount / totalSpending) * 100 : 0,
      }))

    // Top merchants
    const merchantSpending: Record<string, { name: string; amount: number; visits: number }> = {}
    for (const tx of filteredTxs) {
      if (tx.amount >= 0) continue
      const merchantName = tx.merchantName || tx.name
      if (!merchantSpending[merchantName]) {
        merchantSpending[merchantName] = { name: merchantName, amount: 0, visits: 0 }
      }
      merchantSpending[merchantName].amount += Math.abs(tx.amount)
      merchantSpending[merchantName].visits += 1
    }
    const topMerchants = Object.values(merchantSpending)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // Monthly breakdown
    const monthlyData: Record<string, { month: string; spending: number; income: number }> = {}
    for (const tx of filteredTxs) {
      const month = tx.datetime.substring(0, 7) // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, spending: 0, income: 0 }
      }
      if (tx.amount < 0) {
        monthlyData[month].spending += Math.abs(tx.amount)
      } else {
        monthlyData[month].income += tx.amount
      }
    }
    const monthlyTrend = Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month))

    const monthCount = monthlyTrend.length || 1
    const avgMonthlySpending = totalSpending / monthCount
    const avgMonthlyIncome = totalIncome / monthCount
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0

    // Last month vs average
    const lastMonthSpending = monthlyTrend[0]?.spending || 0
    const percentDiff =
      avgMonthlySpending > 0 ? ((lastMonthSpending - avgMonthlySpending) / avgMonthlySpending) * 100 : 0

    // Raw transactions for LLM context
    const rawTransactions = await Promise.all(
      filteredTxs.map(async (tx) => {
        const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null
        return {
          date: tx.datetime.split("T")[0] ?? "",
          merchant: tx.merchantName || tx.name,
          amount: tx.amount,
          category: category?.name || null,
          groupType: category?.groupType || null,
        }
      }),
    )

    // Categories context
    const nonTransferCategories = categories.filter((c) => c.groupType !== "TRANSFER")
    const subcategories = await ctx.db.query("subcategories").collect()
    const subcatMap = new Map<string, string[]>()
    for (const sub of subcategories) {
      const catId = sub.categoryId
      if (!subcatMap.has(catId)) subcatMap.set(catId, [])
      subcatMap.get(catId)!.push(sub.name)
    }

    const categoriesContext = nonTransferCategories
      .map((c) => {
        const subs = subcatMap.get(c._id) || []
        const type = c.groupType ? `[${c.groupType}]` : ""
        return `${c.name} ${type}${subs.length > 0 ? `: ${subs.join(", ")}` : ""}`
      })
      .join("\n")

    return {
      periodMonths: monthCount,
      totalSpending,
      totalIncome,
      savingsRate,
      avgMonthlySpending,
      avgMonthlyIncome,
      spendingByCategory: categoryList,
      topMerchants,
      monthlyTrend,
      recentVsAverage: { lastMonthSpending, avgSpending: avgMonthlySpending, percentDiff },
      rawTransactions,
      categoriesContext,
    }
  },
})
