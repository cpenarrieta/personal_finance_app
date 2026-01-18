// convex/migrations/validate.ts
// Validation queries for migration verification

import { query } from "../_generated/server"
import { v } from "convex/values"

// Get counts for all tables
export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const [
      institutions,
      items,
      accounts,
      transactions,
      categories,
      subcategories,
      tags,
      transactionTags,
      holdings,
      securities,
      investmentTransactions,
      weeklySummaries,
      users,
      sessions,
      oauthAccounts,
      verifications,
      passkeys,
      idMappings,
    ] = await Promise.all([
      ctx.db.query("institutions").collect(),
      ctx.db.query("items").collect(),
      ctx.db.query("accounts").collect(),
      ctx.db.query("transactions").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("subcategories").collect(),
      ctx.db.query("tags").collect(),
      ctx.db.query("transactionTags").collect(),
      ctx.db.query("holdings").collect(),
      ctx.db.query("securities").collect(),
      ctx.db.query("investmentTransactions").collect(),
      ctx.db.query("weeklySummaries").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("sessions").collect(),
      ctx.db.query("oauthAccounts").collect(),
      ctx.db.query("verifications").collect(),
      ctx.db.query("passkeys").collect(),
      ctx.db.query("idMappings").collect(),
    ])

    return {
      institutions: institutions.length,
      items: items.length,
      accounts: accounts.length,
      transactions: transactions.length,
      categories: categories.length,
      subcategories: subcategories.length,
      tags: tags.length,
      transactionTags: transactionTags.length,
      holdings: holdings.length,
      securities: securities.length,
      investmentTransactions: investmentTransactions.length,
      weeklySummaries: weeklySummaries.length,
      users: users.length,
      sessions: sessions.length,
      oauthAccounts: oauthAccounts.length,
      verifications: verifications.length,
      passkeys: passkeys.length,
      idMappings: idMappings.length,
    }
  },
})

// Validate relationships
export const validateRelationships = query({
  args: {},
  handler: async (ctx) => {
    const issues: string[] = []

    // Get all IDs for each table
    const accountIds = new Set((await ctx.db.query("accounts").collect()).map((a) => a._id))
    const categoryIds = new Set((await ctx.db.query("categories").collect()).map((c) => c._id))
    const subcategoryIds = new Set((await ctx.db.query("subcategories").collect()).map((s) => s._id))
    const tagIds = new Set((await ctx.db.query("tags").collect()).map((t) => t._id))
    const transactionIds = new Set((await ctx.db.query("transactions").collect()).map((t) => t._id))
    const itemIds = new Set((await ctx.db.query("items").collect()).map((i) => i._id))
    const institutionIds = new Set((await ctx.db.query("institutions").collect()).map((i) => i._id))
    const securityIds = new Set((await ctx.db.query("securities").collect()).map((s) => s._id))
    const userIds = new Set((await ctx.db.query("users").collect()).map((u) => u._id))

    // Check transactions
    const transactions = await ctx.db.query("transactions").collect()
    let orphanedTransactions = 0
    let invalidCategoryRefs = 0
    let invalidSubcategoryRefs = 0
    let invalidParentRefs = 0

    for (const tx of transactions) {
      if (!accountIds.has(tx.accountId)) orphanedTransactions++
      if (tx.categoryId && !categoryIds.has(tx.categoryId)) invalidCategoryRefs++
      if (tx.subcategoryId && !subcategoryIds.has(tx.subcategoryId)) invalidSubcategoryRefs++
      if (tx.parentTransactionId && !transactionIds.has(tx.parentTransactionId)) invalidParentRefs++
    }

    if (orphanedTransactions > 0) issues.push(`${orphanedTransactions} transactions with invalid accountId`)
    if (invalidCategoryRefs > 0) issues.push(`${invalidCategoryRefs} transactions with invalid categoryId`)
    if (invalidSubcategoryRefs > 0) issues.push(`${invalidSubcategoryRefs} transactions with invalid subcategoryId`)
    if (invalidParentRefs > 0) issues.push(`${invalidParentRefs} transactions with invalid parentTransactionId`)

    // Check accounts
    const accounts = await ctx.db.query("accounts").collect()
    let orphanedAccounts = 0
    for (const acc of accounts) {
      if (!itemIds.has(acc.itemId)) orphanedAccounts++
    }
    if (orphanedAccounts > 0) issues.push(`${orphanedAccounts} accounts with invalid itemId`)

    // Check items
    const items = await ctx.db.query("items").collect()
    let invalidInstitutionRefs = 0
    for (const item of items) {
      if (item.institutionId && !institutionIds.has(item.institutionId)) invalidInstitutionRefs++
    }
    if (invalidInstitutionRefs > 0) issues.push(`${invalidInstitutionRefs} items with invalid institutionId`)

    // Check subcategories
    const subcategories = await ctx.db.query("subcategories").collect()
    let orphanedSubcategories = 0
    for (const sub of subcategories) {
      if (!categoryIds.has(sub.categoryId)) orphanedSubcategories++
    }
    if (orphanedSubcategories > 0) issues.push(`${orphanedSubcategories} subcategories with invalid categoryId`)

    // Check transactionTags
    const transactionTags = await ctx.db.query("transactionTags").collect()
    let orphanedTags = 0
    for (const tt of transactionTags) {
      if (!transactionIds.has(tt.transactionId) || !tagIds.has(tt.tagId)) orphanedTags++
    }
    if (orphanedTags > 0) issues.push(`${orphanedTags} transactionTags with invalid references`)

    // Check holdings
    const holdings = await ctx.db.query("holdings").collect()
    let orphanedHoldings = 0
    for (const h of holdings) {
      if (!accountIds.has(h.accountId) || !securityIds.has(h.securityId)) orphanedHoldings++
    }
    if (orphanedHoldings > 0) issues.push(`${orphanedHoldings} holdings with invalid references`)

    // Check investmentTransactions
    const investmentTxs = await ctx.db.query("investmentTransactions").collect()
    let orphanedInvestmentTxs = 0
    for (const itx of investmentTxs) {
      if (!accountIds.has(itx.accountId)) orphanedInvestmentTxs++
      if (itx.securityId && !securityIds.has(itx.securityId)) orphanedInvestmentTxs++
    }
    if (orphanedInvestmentTxs > 0)
      issues.push(`${orphanedInvestmentTxs} investmentTransactions with invalid references`)

    // Check sessions
    const sessions = await ctx.db.query("sessions").collect()
    let orphanedSessions = 0
    for (const s of sessions) {
      if (!userIds.has(s.userId)) orphanedSessions++
    }
    if (orphanedSessions > 0) issues.push(`${orphanedSessions} sessions with invalid userId`)

    // Check oauthAccounts
    const oauthAccounts = await ctx.db.query("oauthAccounts").collect()
    let orphanedOAuth = 0
    for (const oa of oauthAccounts) {
      if (!userIds.has(oa.userId)) orphanedOAuth++
    }
    if (orphanedOAuth > 0) issues.push(`${orphanedOAuth} oauthAccounts with invalid userId`)

    // Check passkeys
    const passkeys = await ctx.db.query("passkeys").collect()
    let orphanedPasskeys = 0
    for (const p of passkeys) {
      if (!userIds.has(p.userId)) orphanedPasskeys++
    }
    if (orphanedPasskeys > 0) issues.push(`${orphanedPasskeys} passkeys with invalid userId`)

    return {
      valid: issues.length === 0,
      issues,
    }
  },
})

// Compare counts with expected
export const compareCounts = query({
  args: {
    expected: v.object({
      institutions: v.number(),
      items: v.number(),
      accounts: v.number(),
      transactions: v.number(),
      categories: v.number(),
      subcategories: v.number(),
      tags: v.number(),
      transactionTags: v.number(),
      holdings: v.number(),
      securities: v.number(),
      investmentTransactions: v.number(),
      weeklySummaries: v.number(),
      users: v.number(),
      sessions: v.number(),
      oauthAccounts: v.number(),
      verifications: v.number(),
      passkeys: v.number(),
    }),
  },
  handler: async (ctx, { expected }) => {
    const actual = {
      institutions: (await ctx.db.query("institutions").collect()).length,
      items: (await ctx.db.query("items").collect()).length,
      accounts: (await ctx.db.query("accounts").collect()).length,
      transactions: (await ctx.db.query("transactions").collect()).length,
      categories: (await ctx.db.query("categories").collect()).length,
      subcategories: (await ctx.db.query("subcategories").collect()).length,
      tags: (await ctx.db.query("tags").collect()).length,
      transactionTags: (await ctx.db.query("transactionTags").collect()).length,
      holdings: (await ctx.db.query("holdings").collect()).length,
      securities: (await ctx.db.query("securities").collect()).length,
      investmentTransactions: (await ctx.db.query("investmentTransactions").collect()).length,
      weeklySummaries: (await ctx.db.query("weeklySummaries").collect()).length,
      users: (await ctx.db.query("users").collect()).length,
      sessions: (await ctx.db.query("sessions").collect()).length,
      oauthAccounts: (await ctx.db.query("oauthAccounts").collect()).length,
      verifications: (await ctx.db.query("verifications").collect()).length,
      passkeys: (await ctx.db.query("passkeys").collect()).length,
    }

    const comparison: Record<string, { expected: number; actual: number; match: boolean }> = {}
    let allMatch = true

    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      const match = expected[key] === actual[key]
      comparison[key] = {
        expected: expected[key],
        actual: actual[key],
        match,
      }
      if (!match) allMatch = false
    }

    return {
      allMatch,
      comparison,
    }
  },
})

// Sample data verification - get a few transactions to spot-check
export const getSampleTransactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    const transactions = await ctx.db.query("transactions").take(limit)

    return Promise.all(
      transactions.map(async (tx) => {
        const account = await ctx.db.get(tx.accountId)
        const category = tx.categoryId ? await ctx.db.get(tx.categoryId) : null
        const subcategory = tx.subcategoryId ? await ctx.db.get(tx.subcategoryId) : null

        return {
          _id: tx._id,
          plaidTransactionId: tx.plaidTransactionId,
          amount: tx.amount,
          name: tx.name,
          datetime: tx.datetime,
          account: account ? { name: account.name, type: account.type } : null,
          category: category ? { name: category.name } : null,
          subcategory: subcategory ? { name: subcategory.name } : null,
        }
      }),
    )
  },
})

// Cleanup migration table
export const getIdMappingsCount = query({
  args: {},
  handler: async (ctx) => {
    const mappings = await ctx.db.query("idMappings").collect()

    // Group by table
    const byTable: Record<string, number> = {}
    for (const m of mappings) {
      byTable[m.tableName] = (byTable[m.tableName] ?? 0) + 1
    }

    return {
      total: mappings.length,
      byTable,
    }
  },
})
