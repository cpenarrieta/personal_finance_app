// convex/investments.ts
// Investment queries - replaces src/lib/db/queries/investments.ts

import { query } from "./_generated/server"
import { v } from "convex/values"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number | undefined | null): string | null {
  if (!ts) return null
  return new Date(ts).toISOString()
}

/**
 * Get all holdings with relations
 * Replaces: getAllHoldings()
 */
export const getAllHoldings = query({
  args: {},
  handler: async (ctx) => {
    const holdings = await ctx.db.query("holdings").collect()

    const result = await Promise.all(
      holdings.map(async (h) => {
        const [security, account] = await Promise.all([ctx.db.get(h.securityId), ctx.db.get(h.accountId)])

        return {
          id: h._id,
          accountId: h.accountId,
          securityId: h.securityId,
          quantity_number: h.quantity,
          cost_basis_number: h.costBasis ?? null,
          institution_price_number: h.institutionPrice ?? null,
          institution_price_as_of_string: formatTimestamp(h.institutionPriceAsOf),
          isoCurrencyCode: h.isoCurrencyCode ?? null,
          created_at_string: formatTimestamp(h.createdAt),
          updated_at_string: formatTimestamp(h.updatedAt),
          security: security
            ? {
                id: security._id,
                plaidSecurityId: security.plaidSecurityId,
                name: security.name ?? null,
                tickerSymbol: security.tickerSymbol ?? null,
                type: security.type ?? null,
                isoCurrencyCode: security.isoCurrencyCode ?? null,
                logoUrl: security.logoUrl ?? null,
                created_at_string: formatTimestamp(security.createdAt),
                updated_at_string: formatTimestamp(security.updatedAt),
              }
            : null,
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
        }
      }),
    )

    return result
  },
})

/**
 * Get holdings for a specific account
 * Replaces: getHoldingsForAccount()
 */
export const getHoldingsForAccount = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .collect()

    const result = await Promise.all(
      holdings.map(async (h) => {
        const [security, account] = await Promise.all([ctx.db.get(h.securityId), ctx.db.get(h.accountId)])

        return {
          id: h._id,
          accountId: h.accountId,
          securityId: h.securityId,
          quantity_number: h.quantity,
          cost_basis_number: h.costBasis ?? null,
          institution_price_number: h.institutionPrice ?? null,
          institution_price_as_of_string: formatTimestamp(h.institutionPriceAsOf),
          isoCurrencyCode: h.isoCurrencyCode ?? null,
          created_at_string: formatTimestamp(h.createdAt),
          updated_at_string: formatTimestamp(h.updatedAt),
          security: security
            ? {
                id: security._id,
                plaidSecurityId: security.plaidSecurityId,
                name: security.name ?? null,
                tickerSymbol: security.tickerSymbol ?? null,
                type: security.type ?? null,
                isoCurrencyCode: security.isoCurrencyCode ?? null,
                logoUrl: security.logoUrl ?? null,
                created_at_string: formatTimestamp(security.createdAt),
                updated_at_string: formatTimestamp(security.updatedAt),
              }
            : null,
          account: account
            ? {
                id: account._id,
                name: account.name,
                type: account.type,
                mask: account.mask ?? null,
              }
            : null,
        }
      }),
    )

    return result
  },
})

/**
 * Get all investment transactions with relations
 * Replaces: getAllInvestmentTransactions()
 */
export const getAllInvestmentTransactions = query({
  args: {},
  handler: async (ctx) => {
    const transactions = await ctx.db.query("investmentTransactions").collect()

    // Sort by transactionDatetime desc
    const sorted = transactions.sort((a, b) => {
      const aDate = a.transactionDatetime || ""
      const bDate = b.transactionDatetime || ""
      return bDate.localeCompare(aDate)
    })

    const result = await Promise.all(
      sorted.map(async (t) => {
        const [account, security] = await Promise.all([
          ctx.db.get(t.accountId),
          t.securityId ? ctx.db.get(t.securityId) : null,
        ])

        return {
          id: t._id,
          plaidInvestmentTransactionId: t.plaidInvestmentTransactionId,
          accountId: t.accountId,
          securityId: t.securityId ?? null,
          type: t.type,
          amount_number: t.amount ?? null,
          price_number: t.price ?? null,
          quantity_number: t.quantity ?? null,
          fees_number: t.fees ?? null,
          isoCurrencyCode: t.isoCurrencyCode ?? null,
          transactionDatetime: t.transactionDatetime ?? null,
          name: t.name ?? null,
          created_at_string: formatTimestamp(t.createdAt),
          updated_at_string: formatTimestamp(t.updatedAt),
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
          security: security
            ? {
                id: security._id,
                plaidSecurityId: security.plaidSecurityId,
                name: security.name ?? null,
                tickerSymbol: security.tickerSymbol ?? null,
                type: security.type ?? null,
                isoCurrencyCode: security.isoCurrencyCode ?? null,
                logoUrl: security.logoUrl ?? null,
                created_at_string: formatTimestamp(security.createdAt),
                updated_at_string: formatTimestamp(security.updatedAt),
              }
            : null,
        }
      }),
    )

    return result
  },
})

/**
 * Get investment transactions for a specific account
 * Replaces: getInvestmentTransactionsForAccount()
 */
export const getInvestmentTransactionsForAccount = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const transactions = await ctx.db
      .query("investmentTransactions")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .collect()

    // Sort by transactionDatetime desc
    const sorted = transactions.sort((a, b) => {
      const aDate = a.transactionDatetime || ""
      const bDate = b.transactionDatetime || ""
      return bDate.localeCompare(aDate)
    })

    const result = await Promise.all(
      sorted.map(async (t) => {
        const [account, security] = await Promise.all([
          ctx.db.get(t.accountId),
          t.securityId ? ctx.db.get(t.securityId) : null,
        ])

        return {
          id: t._id,
          plaidInvestmentTransactionId: t.plaidInvestmentTransactionId,
          accountId: t.accountId,
          securityId: t.securityId ?? null,
          type: t.type,
          amount_number: t.amount ?? null,
          price_number: t.price ?? null,
          quantity_number: t.quantity ?? null,
          fees_number: t.fees ?? null,
          isoCurrencyCode: t.isoCurrencyCode ?? null,
          transactionDatetime: t.transactionDatetime ?? null,
          name: t.name ?? null,
          created_at_string: formatTimestamp(t.createdAt),
          updated_at_string: formatTimestamp(t.updatedAt),
          account: account
            ? {
                id: account._id,
                name: account.name,
                type: account.type,
                mask: account.mask ?? null,
              }
            : null,
          security: security
            ? {
                id: security._id,
                plaidSecurityId: security.plaidSecurityId,
                name: security.name ?? null,
                tickerSymbol: security.tickerSymbol ?? null,
                type: security.type ?? null,
                isoCurrencyCode: security.isoCurrencyCode ?? null,
                logoUrl: security.logoUrl ?? null,
                created_at_string: formatTimestamp(security.createdAt),
                updated_at_string: formatTimestamp(security.updatedAt),
              }
            : null,
        }
      }),
    )

    return result
  },
})

/**
 * Get all securities
 */
export const getAllSecurities = query({
  args: {},
  handler: async (ctx) => {
    const securities = await ctx.db.query("securities").collect()

    return securities.map((s) => ({
      id: s._id,
      plaidSecurityId: s.plaidSecurityId,
      name: s.name ?? null,
      tickerSymbol: s.tickerSymbol ?? null,
      type: s.type ?? null,
      isoCurrencyCode: s.isoCurrencyCode ?? null,
      logoUrl: s.logoUrl ?? null,
      created_at_string: formatTimestamp(s.createdAt),
      updated_at_string: formatTimestamp(s.updatedAt),
    }))
  },
})

/**
 * Get holdings for a specific ticker symbol with account details
 */
export const getHoldingsByTickerSymbol = query({
  args: { tickerSymbol: v.string() },
  handler: async (ctx, { tickerSymbol }) => {
    const security = await ctx.db
      .query("securities")
      .withIndex("by_tickerSymbol", (q) => q.eq("tickerSymbol", tickerSymbol))
      .first()

    if (!security) return null

    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_securityId", (q) => q.eq("securityId", security._id))
      .collect()

    const holdingsWithAccounts = await Promise.all(
      holdings.map(async (h) => {
        const account = await ctx.db.get(h.accountId)
        return {
          id: h._id,
          accountId: h.accountId,
          securityId: h.securityId,
          quantity_number: h.quantity,
          cost_basis_number: h.costBasis ?? null,
          institution_price_number: h.institutionPrice ?? null,
          institution_price_as_of_string: formatTimestamp(h.institutionPriceAsOf),
          isoCurrencyCode: h.isoCurrencyCode ?? null,
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
        }
      }),
    )

    return {
      security: {
        id: security._id,
        plaidSecurityId: security.plaidSecurityId,
        name: security.name ?? null,
        tickerSymbol: security.tickerSymbol ?? null,
        type: security.type ?? null,
        isoCurrencyCode: security.isoCurrencyCode ?? null,
        logoUrl: security.logoUrl ?? null,
        created_at_string: formatTimestamp(security.createdAt),
        updated_at_string: formatTimestamp(security.updatedAt),
      },
      holdings: holdingsWithAccounts,
    }
  },
})

/**
 * Get investment transactions for a specific ticker symbol
 */
export const getInvestmentTransactionsByTickerSymbol = query({
  args: { tickerSymbol: v.string() },
  handler: async (ctx, { tickerSymbol }) => {
    const security = await ctx.db
      .query("securities")
      .withIndex("by_tickerSymbol", (q) => q.eq("tickerSymbol", tickerSymbol))
      .first()

    if (!security) return null

    const transactions = await ctx.db
      .query("investmentTransactions")
      .withIndex("by_securityId", (q) => q.eq("securityId", security._id))
      .collect()

    const sorted = transactions.sort((a, b) => {
      const aDate = a.transactionDatetime || ""
      const bDate = b.transactionDatetime || ""
      return bDate.localeCompare(aDate)
    })

    const result = await Promise.all(
      sorted.map(async (t) => {
        const account = await ctx.db.get(t.accountId)
        return {
          id: t._id,
          plaidInvestmentTransactionId: t.plaidInvestmentTransactionId,
          accountId: t.accountId,
          securityId: t.securityId ?? null,
          type: t.type,
          amount_number: t.amount ?? null,
          price_number: t.price ?? null,
          quantity_number: t.quantity ?? null,
          fees_number: t.fees ?? null,
          isoCurrencyCode: t.isoCurrencyCode ?? null,
          transactionDatetime: t.transactionDatetime ?? null,
          name: t.name ?? null,
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
        }
      }),
    )

    return result
  },
})

/**
 * Get security by Plaid security ID
 */
export const getSecurityByPlaidId = query({
  args: { plaidSecurityId: v.string() },
  handler: async (ctx, { plaidSecurityId }) => {
    return ctx.db
      .query("securities")
      .withIndex("by_plaidSecurityId", (q) => q.eq("plaidSecurityId", plaidSecurityId))
      .first()
  },
})
