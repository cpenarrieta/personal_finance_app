// convex/dashboard.ts
// Dashboard queries for aggregated data

import { query } from "./_generated/server"
import { v } from "convex/values"
import { Doc } from "./_generated/dataModel"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number | undefined | null): string | null {
  if (!ts) return null
  return new Date(ts).toISOString()
}

/**
 * Check if user has any connected Plaid items
 */
export const hasConnectedItems = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").first()
    return items !== null
  },
})

/**
 * Get dashboard metrics (accounts with institution and holdings with security)
 */
export const getMetrics = query({
  args: {},
  handler: async (ctx) => {
    const [accounts, holdings] = await Promise.all([
      ctx.db.query("accounts").collect(),
      ctx.db.query("holdings").collect(),
    ])

    // Sort accounts by name
    const sortedAccounts = accounts.sort((a, b) => a.name.localeCompare(b.name))

    // Build accounts with institution
    const accountsWithInstitution = await Promise.all(
      sortedAccounts.map(async (acc) => {
        const item = await ctx.db.get(acc.itemId)
        const institution = item?.institutionId ? await ctx.db.get(item.institutionId) : null

        return {
          id: acc._id,
          plaidAccountId: acc.plaidAccountId,
          itemId: acc.itemId,
          name: acc.name,
          officialName: acc.officialName ?? null,
          mask: acc.mask ?? null,
          type: acc.type,
          subtype: acc.subtype ?? null,
          currency: acc.currency ?? null,
          current_balance_number: acc.currentBalance ?? null,
          available_balance_number: acc.availableBalance ?? null,
          credit_limit_number: acc.creditLimit ?? null,
          balance_updated_at_string: formatTimestamp(acc.balanceUpdatedAt),
          created_at_string: formatTimestamp(acc.createdAt)!,
          updated_at_string: formatTimestamp(acc.updatedAt)!,
          item: item
            ? {
                id: item._id,
                plaidItemId: item.plaidItemId,
                status: item.status ?? null,
                created_at_string: formatTimestamp(item.createdAt),
                updated_at_string: formatTimestamp(item.updatedAt),
                institution: institution
                  ? {
                      id: institution._id,
                      name: institution.name,
                      logoUrl: institution.logoUrl ?? null,
                      shortName: institution.shortName ?? null,
                      created_at_string: formatTimestamp(institution.createdAt),
                    }
                  : null,
              }
            : null,
        }
      }),
    )

    // Build holdings with security
    const holdingsWithSecurity = await Promise.all(
      holdings.map(async (h) => {
        const security = h.securityId ? await ctx.db.get(h.securityId) : null

        return {
          id: h._id,
          accountId: h.accountId,
          securityId: h.securityId ?? null,
          quantity_number: h.quantity ?? null,
          cost_basis_number: h.costBasis ?? null,
          institution_price_number: h.institutionPrice ?? null,
          institution_price_as_of_string: formatTimestamp(h.institutionPriceAsOf),
          isoCurrencyCode: h.isoCurrencyCode ?? null,
          created_at_string: formatTimestamp(h.createdAt)!,
          updated_at_string: formatTimestamp(h.updatedAt)!,
          security: security
            ? {
                id: security._id,
                plaidSecurityId: security.plaidSecurityId,
                name: security.name ?? null,
                tickerSymbol: security.tickerSymbol ?? null,
                type: security.type ?? null,
                isoCurrencyCode: security.isoCurrencyCode ?? null,
                logoUrl: security.logoUrl ?? null,
                created_at_string: formatTimestamp(security.createdAt)!,
                updated_at_string: formatTimestamp(security.updatedAt)!,
              }
            : null,
        }
      }),
    )

    return {
      accounts: accountsWithInstitution,
      holdings: holdingsWithSecurity,
    }
  },
})

/**
 * Get count of transactions that need review
 * Includes both uncategorized transactions AND transactions with "for-review" or "sign-review" tag
 */
export const getReviewCount = query({
  args: {},
  handler: async (ctx) => {
    // Get review tag IDs
    const [forReviewTag, signReviewTag] = await Promise.all([
      ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", "for-review"))
        .first(),
      ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", "sign-review"))
        .first(),
    ])

    const reviewTagIds = [forReviewTag?._id, signReviewTag?._id].filter(Boolean) as Doc<"tags">["_id"][]

    // Get all non-split transactions
    const transactions = await ctx.db.query("transactions").collect()
    const nonSplit = transactions.filter((tx) => !tx.isSplit)

    // Count: uncategorized OR has review tags
    let count = 0
    for (const tx of nonSplit) {
      // Check if uncategorized
      if (!tx.categoryId) {
        count++
        continue
      }

      // Check if has review tags
      if (reviewTagIds.length > 0) {
        const txTags = await ctx.db
          .query("transactionTags")
          .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
          .collect()

        const hasReviewTag = txTags.some((tt) => reviewTagIds.includes(tt.tagId))
        if (hasReviewTag) count++
      }
    }

    return count
  },
})

/**
 * Get stats with trends comparing current period to previous period
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 */
export const getStatsWithTrends = query({
  args: { monthsBack: v.number() },
  handler: async (ctx, { monthsBack }) => {
    const now = new Date()

    // Calculate date ranges
    const getDateRange = (offset: number, length: number) => {
      if (offset === 0 && length === 0) {
        // Current month: from start of current month to today
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return { start, end: now }
      }

      // Last N full months
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - (offset - length), 0) // Last day of previous month
      return { start, end }
    }

    let currentRange: { start: Date; end: Date }
    let previousRange: { start: Date; end: Date }

    if (monthsBack === 0) {
      currentRange = getDateRange(0, 0)
      // Previous period: last full month
      previousRange = {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      }
    } else {
      currentRange = {
        start: new Date(now.getFullYear(), now.getMonth() - monthsBack, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      }
      previousRange = {
        start: new Date(now.getFullYear(), now.getMonth() - monthsBack * 2, 1),
        end: new Date(now.getFullYear(), now.getMonth() - monthsBack, 0),
      }
    }

    // Get all non-split transactions
    const transactions = await ctx.db.query("transactions").collect()
    const nonSplit = transactions.filter((tx) => !tx.isSplit)

    // Calculate stats for a date range
    const calculateStats = async (start: Date, end: Date) => {
      const startStr = start.toISOString().split("T")[0] ?? ""
      const endStr = end.toISOString().split("T")[0] ?? ""

      let spending = 0
      let income = 0
      let transactionCount = 0

      for (const tx of nonSplit) {
        const txDate = tx.datetime.split("T")[0] ?? ""
        if (!txDate || txDate < startStr || txDate > endStr) continue

        // Exclude TRANSFER categories
        if (tx.categoryId) {
          const category = await ctx.db.get(tx.categoryId)
          if (category?.groupType === "TRANSFER") continue
        }

        transactionCount++
        if (tx.amount < 0) {
          spending += Math.abs(tx.amount)
        } else {
          income += tx.amount
        }
      }

      return { spending, income, transactionCount }
    }

    const [current, previous] = await Promise.all([
      calculateStats(currentRange.start, currentRange.end),
      calculateStats(previousRange.start, previousRange.end),
    ])

    return { current, previous }
  },
})

/**
 * Get statistics for the last N full months (spending, income, and transactions)
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 */
export const getLastMonthStats = query({
  args: { monthsBack: v.number() },
  handler: async (ctx, { monthsBack }) => {
    const now = new Date()

    let periodStart: Date
    let periodEnd: Date

    if (monthsBack === 0) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = now
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    const startStr = periodStart.toISOString().split("T")[0] ?? ""
    const endStr = periodEnd.toISOString().split("T")[0] ?? ""

    // Get all non-split transactions
    const transactions = await ctx.db.query("transactions").collect()
    const nonSplit = transactions.filter((tx) => !tx.isSplit)

    let totalSpending = 0
    let totalIncome = 0
    const periodTransactions: Doc<"transactions">[] = []

    for (const tx of nonSplit) {
      const txDate = tx.datetime.split("T")[0] ?? ""
      if (!txDate || txDate < startStr || txDate > endStr) continue

      // Exclude TRANSFER categories for stats
      if (tx.categoryId) {
        const category = await ctx.db.get(tx.categoryId)
        if (category?.groupType === "TRANSFER") {
          periodTransactions.push(tx) // Still include in transactions list
          continue
        }
      }

      periodTransactions.push(tx)
      if (tx.amount < 0) {
        totalSpending += Math.abs(tx.amount)
      } else {
        totalIncome += tx.amount
      }
    }

    // Sort by datetime desc
    periodTransactions.sort((a, b) => b.datetime.localeCompare(a.datetime))

    // Build full transaction objects with relations
    const lastMonthTransactions = await Promise.all(
      periodTransactions.map(async (tx) => {
        const [account, category, subcategory, tagJunctions] = await Promise.all([
          ctx.db.get(tx.accountId),
          tx.categoryId ? ctx.db.get(tx.categoryId) : null,
          tx.subcategoryId ? ctx.db.get(tx.subcategoryId) : null,
          ctx.db
            .query("transactionTags")
            .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
            .collect(),
        ])

        const tags = await Promise.all(tagJunctions.map((tj) => ctx.db.get(tj.tagId)))

        return {
          id: tx._id,
          plaidTransactionId: tx.plaidTransactionId,
          accountId: tx.accountId,
          amount_number: tx.amount,
          isoCurrencyCode: tx.isoCurrencyCode ?? null,
          datetime: tx.datetime,
          authorizedDatetime: tx.authorizedDatetime ?? null,
          pending: tx.pending,
          merchantName: tx.merchantName ?? null,
          name: tx.name,
          plaidCategory: tx.plaidCategory ?? null,
          plaidSubcategory: tx.plaidSubcategory ?? null,
          paymentChannel: tx.paymentChannel ?? null,
          pendingTransactionId: tx.pendingTransactionId ?? null,
          logoUrl: tx.logoUrl ?? null,
          categoryIconUrl: tx.categoryIconUrl ?? null,
          categoryId: tx.categoryId ?? null,
          subcategoryId: tx.subcategoryId ?? null,
          notes: tx.notes ?? null,
          isSplit: tx.isSplit,
          parentTransactionId: tx.parentTransactionId ?? null,
          originalTransactionId: tx.originalTransactionId ?? null,
          created_at_string: formatTimestamp(tx.createdAt),
          updated_at_string: formatTimestamp(tx.updatedAt),
          account: account
            ? {
                id: account._id,
                plaidAccountId: account.plaidAccountId,
                name: account.name,
                type: account.type,
                subtype: account.subtype ?? null,
                mask: account.mask ?? null,
              }
            : null,
          category: category
            ? {
                id: category._id,
                name: category.name,
                imageUrl: category.imageUrl ?? null,
                groupType: category.groupType ?? null,
                created_at_string: formatTimestamp(category.createdAt),
                updated_at_string: formatTimestamp(category.updatedAt),
              }
            : null,
          subcategory: subcategory
            ? {
                id: subcategory._id,
                categoryId: subcategory.categoryId,
                name: subcategory.name,
                imageUrl: subcategory.imageUrl ?? null,
                created_at_string: formatTimestamp(subcategory.createdAt),
                updated_at_string: formatTimestamp(subcategory.updatedAt),
              }
            : null,
          tags: tags.filter(Boolean).map((tag) => ({
            id: tag!._id,
            name: tag!.name,
            color: tag!.color,
            created_at_string: formatTimestamp(tag!.createdAt),
            updated_at_string: formatTimestamp(tag!.updatedAt),
          })),
        }
      }),
    )

    return {
      totalLastMonthSpending: totalSpending,
      totalLastMonthIncome: totalIncome,
      lastMonthTransactions,
      lastMonthStart: startStr,
      lastMonthEnd: endStr,
    }
  },
})

/**
 * Get top expensive transactions from the last N full months
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 * @param limit Maximum number of transactions to return
 */
export const getTopExpensiveTransactions = query({
  args: {
    monthsBack: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { monthsBack, limit = 25 }) => {
    const now = new Date()

    let periodStart: Date
    let periodEnd: Date

    if (monthsBack === 0) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = now
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    const startStr = periodStart.toISOString().split("T")[0] ?? ""
    const endStr = periodEnd.toISOString().split("T")[0] ?? ""

    // Get all non-split transactions
    const transactions = await ctx.db.query("transactions").collect()
    const nonSplit = transactions.filter((tx) => !tx.isSplit)

    // Filter for expenses in date range, excluding transfers
    const expenses: { tx: Doc<"transactions">; amount: number }[] = []

    for (const tx of nonSplit) {
      const txDate = tx.datetime.split("T")[0] ?? ""
      if (!txDate || txDate < startStr || txDate > endStr) continue
      if (tx.amount >= 0) continue // Only expenses

      // Exclude TRANSFER categories
      if (tx.categoryId) {
        const category = await ctx.db.get(tx.categoryId)
        if (category?.groupType === "TRANSFER") continue
      }

      expenses.push({ tx, amount: tx.amount })
    }

    // Sort by amount (most negative first)
    expenses.sort((a, b) => a.amount - b.amount)
    const topExpenses = expenses.slice(0, limit)

    // Build full transaction objects
    const result = await Promise.all(
      topExpenses.map(async ({ tx }) => {
        const [account, category, subcategory, tagJunctions] = await Promise.all([
          ctx.db.get(tx.accountId),
          tx.categoryId ? ctx.db.get(tx.categoryId) : null,
          tx.subcategoryId ? ctx.db.get(tx.subcategoryId) : null,
          ctx.db
            .query("transactionTags")
            .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
            .collect(),
        ])

        const tags = await Promise.all(tagJunctions.map((tj) => ctx.db.get(tj.tagId)))

        return {
          id: tx._id,
          plaidTransactionId: tx.plaidTransactionId,
          accountId: tx.accountId,
          amount_number: tx.amount,
          isoCurrencyCode: tx.isoCurrencyCode ?? null,
          datetime: tx.datetime,
          authorizedDatetime: tx.authorizedDatetime ?? null,
          pending: tx.pending,
          merchantName: tx.merchantName ?? null,
          name: tx.name,
          plaidCategory: tx.plaidCategory ?? null,
          plaidSubcategory: tx.plaidSubcategory ?? null,
          paymentChannel: tx.paymentChannel ?? null,
          pendingTransactionId: tx.pendingTransactionId ?? null,
          logoUrl: tx.logoUrl ?? null,
          categoryIconUrl: tx.categoryIconUrl ?? null,
          categoryId: tx.categoryId ?? null,
          subcategoryId: tx.subcategoryId ?? null,
          notes: tx.notes ?? null,
          isSplit: tx.isSplit,
          parentTransactionId: tx.parentTransactionId ?? null,
          originalTransactionId: tx.originalTransactionId ?? null,
          created_at_string: formatTimestamp(tx.createdAt),
          updated_at_string: formatTimestamp(tx.updatedAt),
          account: account
            ? {
                id: account._id,
                plaidAccountId: account.plaidAccountId,
                name: account.name,
                type: account.type,
                subtype: account.subtype ?? null,
                mask: account.mask ?? null,
              }
            : null,
          category: category
            ? {
                id: category._id,
                name: category.name,
                imageUrl: category.imageUrl ?? null,
                groupType: category.groupType ?? null,
                created_at_string: formatTimestamp(category.createdAt),
                updated_at_string: formatTimestamp(category.updatedAt),
              }
            : null,
          subcategory: subcategory
            ? {
                id: subcategory._id,
                categoryId: subcategory.categoryId,
                name: subcategory.name,
                imageUrl: subcategory.imageUrl ?? null,
                created_at_string: formatTimestamp(subcategory.createdAt),
                updated_at_string: formatTimestamp(subcategory.updatedAt),
              }
            : null,
          tags: tags.filter(Boolean).map((tag) => ({
            id: tag!._id,
            name: tag!.name,
            color: tag!.color,
            created_at_string: formatTimestamp(tag!.createdAt),
            updated_at_string: formatTimestamp(tag!.updatedAt),
          })),
        }
      }),
    )

    return result
  },
})
