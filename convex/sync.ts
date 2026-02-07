// convex/sync.ts
// Sync mutations for Plaid data synchronization
// Used by sync services to write data from Plaid to Convex

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// ============================================================================
// ITEMS - Queries and mutations for Plaid items
// ============================================================================

export const getAllItems = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect()
    // Never expose accessToken in query results
    return items.map((item) => ({
      id: item._id,
      plaidItemId: item.plaidItemId,
      status: item.status ?? null,
      lastTransactionsCursor: item.lastTransactionsCursor ?? null,
      lastInvestmentsCursor: item.lastInvestmentsCursor ?? null,
    }))
  },
})

export const getItemByPlaidId = query({
  args: { plaidItemId: v.string() },
  handler: async (ctx, { plaidItemId }) => {
    const item = await ctx.db
      .query("items")
      .withIndex("by_plaidItemId", (q) => q.eq("plaidItemId", plaidItemId))
      .first()

    if (!item) return null

    // Never expose accessToken in query results
    return {
      id: item._id,
      plaidItemId: item.plaidItemId,
      status: item.status ?? null,
      lastTransactionsCursor: item.lastTransactionsCursor ?? null,
      lastInvestmentsCursor: item.lastInvestmentsCursor ?? null,
    }
  },
})

export const getItemWithInstitution = query({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id)
    if (!item) return null

    const institution = item.institutionId ? await ctx.db.get(item.institutionId) : null

    return {
      id: item._id,
      plaidItemId: item.plaidItemId,
      institution: institution ? { name: institution.name } : null,
    }
  },
})

export const updateItemStatus = mutation({
  args: {
    id: v.id("items"),
    status: v.string(),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: Date.now() })
    return id
  },
})

export const updateItemCursor = mutation({
  args: {
    id: v.id("items"),
    lastTransactionsCursor: v.optional(v.string()),
    lastInvestmentsCursor: v.optional(v.string()),
  },
  handler: async (ctx, { id, lastTransactionsCursor, lastInvestmentsCursor }) => {
    const updates: Record<string, any> = { updatedAt: Date.now() }
    if (lastTransactionsCursor !== undefined) updates.lastTransactionsCursor = lastTransactionsCursor
    if (lastInvestmentsCursor !== undefined) updates.lastInvestmentsCursor = lastInvestmentsCursor
    await ctx.db.patch(id, updates)
    return id
  },
})

// ============================================================================
// ACCOUNTS - Upsert accounts from Plaid
// ============================================================================

export const getAccountByPlaidId = query({
  args: { plaidAccountId: v.string() },
  handler: async (ctx, { plaidAccountId }) => {
    return ctx.db
      .query("accounts")
      .withIndex("by_plaidAccountId", (q) => q.eq("plaidAccountId", plaidAccountId))
      .first()
  },
})

export const getAccountsByItemId = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .collect()
    return accounts.map((a) => ({
      id: a._id,
      plaidAccountId: a.plaidAccountId,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
    }))
  },
})

export const upsertAccount = mutation({
  args: {
    plaidAccountId: v.string(),
    itemId: v.id("items"),
    name: v.string(),
    officialName: v.optional(v.string()),
    mask: v.optional(v.string()),
    type: v.string(),
    subtype: v.optional(v.string()),
    currency: v.optional(v.string()),
    currentBalance: v.optional(v.number()),
    availableBalance: v.optional(v.number()),
    creditLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_plaidAccountId", (q) => q.eq("plaidAccountId", args.plaidAccountId))
      .first()

    const now = Date.now()

    if (existing) {
      // Update - preserve user's custom name
      await ctx.db.patch(existing._id, {
        itemId: args.itemId,
        officialName: args.officialName,
        mask: args.mask,
        type: args.type,
        subtype: args.subtype,
        currency: args.currency,
        currentBalance: args.currentBalance,
        availableBalance: args.availableBalance,
        creditLimit: args.creditLimit,
        balanceUpdatedAt: now,
        updatedAt: now,
      })
      return existing._id
    } else {
      // Create new
      return ctx.db.insert("accounts", {
        plaidAccountId: args.plaidAccountId,
        itemId: args.itemId,
        name: args.name,
        officialName: args.officialName,
        mask: args.mask,
        type: args.type,
        subtype: args.subtype,
        currency: args.currency,
        currentBalance: args.currentBalance,
        availableBalance: args.availableBalance,
        creditLimit: args.creditLimit,
        balanceUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

// ============================================================================
// TRANSACTIONS - Sync operations
// ============================================================================

export const findTransactionByPlaidId = query({
  args: { plaidTransactionId: v.string() },
  handler: async (ctx, { plaidTransactionId }) => {
    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_plaidTransactionId", (q) => q.eq("plaidTransactionId", plaidTransactionId))
      .first()
    if (!tx) return null
    return {
      id: tx._id,
      plaidTransactionId: tx.plaidTransactionId,
      isSplit: tx.isSplit,
      amount: tx.amount,
      parentTransactionId: tx.parentTransactionId ?? null,
    }
  },
})

export const findTransactionByOriginalId = query({
  args: { originalTransactionId: v.string() },
  handler: async (ctx, { originalTransactionId }) => {
    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_originalTransactionId", (q) => q.eq("originalTransactionId", originalTransactionId))
      .first()
    if (!tx) return null
    return {
      id: tx._id,
      plaidTransactionId: tx.plaidTransactionId,
      isSplit: tx.isSplit,
      amount: tx.amount,
    }
  },
})

export const findTransactionForSync = query({
  args: { plaidTransactionId: v.string() },
  handler: async (ctx, { plaidTransactionId }) => {
    // Check by plaid transaction id
    let tx = await ctx.db
      .query("transactions")
      .withIndex("by_plaidTransactionId", (q) => q.eq("plaidTransactionId", plaidTransactionId))
      .first()

    // Also check by originalTransactionId (for splits)
    if (!tx) {
      tx = await ctx.db
        .query("transactions")
        .withIndex("by_originalTransactionId", (q) => q.eq("originalTransactionId", plaidTransactionId))
        .first()
    }

    if (!tx) return null
    return {
      id: tx._id,
      plaidTransactionId: tx.plaidTransactionId,
      isSplit: tx.isSplit,
      amount: tx.amount,
      parentTransactionId: tx.parentTransactionId ?? null,
    }
  },
})

export const upsertTransaction = mutation({
  args: {
    plaidTransactionId: v.string(),
    accountPlaidId: v.string(),
    amount: v.number(),
    isoCurrencyCode: v.optional(v.string()),
    date: v.number(),
    authorizedDate: v.optional(v.number()),
    datetime: v.string(),
    authorizedDatetime: v.optional(v.string()),
    pending: v.boolean(),
    merchantName: v.optional(v.string()),
    name: v.string(),
    plaidCategory: v.optional(v.string()),
    plaidSubcategory: v.optional(v.string()),
    paymentChannel: v.optional(v.string()),
    pendingTransactionId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    categoryIconUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find account by plaid account id
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_plaidAccountId", (q) => q.eq("plaidAccountId", args.accountPlaidId))
      .first()

    if (!account) throw new Error(`Account not found for plaidAccountId: ${args.accountPlaidId}`)

    const now = Date.now()

    // Check for existing transaction
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_plaidTransactionId", (q) => q.eq("plaidTransactionId", args.plaidTransactionId))
      .first()

    const transactionData = {
      accountId: account._id,
      amount: args.amount,
      isoCurrencyCode: args.isoCurrencyCode,
      date: args.date,
      authorizedDate: args.authorizedDate,
      datetime: args.datetime,
      authorizedDatetime: args.authorizedDatetime,
      pending: args.pending,
      merchantName: args.merchantName,
      name: args.name,
      plaidCategory: args.plaidCategory,
      plaidSubcategory: args.plaidSubcategory,
      paymentChannel: args.paymentChannel,
      pendingTransactionId: args.pendingTransactionId,
      logoUrl: args.logoUrl,
      categoryIconUrl: args.categoryIconUrl,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, transactionData)
      return { id: existing._id, isNew: false }
    } else {
      const id = await ctx.db.insert("transactions", {
        plaidTransactionId: args.plaidTransactionId,
        ...transactionData,
        files: [],
        isSplit: false,
        isManual: false,
        createdAt: now,
      })
      return { id, isNew: true }
    }
  },
})

export const updateTransactionByPlaidId = mutation({
  args: {
    plaidTransactionId: v.string(),
    amount: v.number(),
    isoCurrencyCode: v.optional(v.string()),
    date: v.number(),
    authorizedDate: v.optional(v.number()),
    datetime: v.string(),
    authorizedDatetime: v.optional(v.string()),
    pending: v.boolean(),
    merchantName: v.optional(v.string()),
    name: v.string(),
    plaidCategory: v.optional(v.string()),
    plaidSubcategory: v.optional(v.string()),
    paymentChannel: v.optional(v.string()),
    pendingTransactionId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    categoryIconUrl: v.optional(v.string()),
  },
  handler: async (ctx, { plaidTransactionId, ...data }) => {
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_plaidTransactionId", (q) => q.eq("plaidTransactionId", plaidTransactionId))
      .first()

    if (!existing) throw new Error(`Transaction not found: ${plaidTransactionId}`)

    await ctx.db.patch(existing._id, { ...data, updatedAt: Date.now() })
    return existing._id
  },
})

export const deleteRemovedTransactions = mutation({
  args: {
    plaidTransactionIds: v.array(v.string()),
  },
  handler: async (ctx, { plaidTransactionIds }) => {
    let count = 0
    for (const plaidId of plaidTransactionIds) {
      const tx = await ctx.db
        .query("transactions")
        .withIndex("by_plaidTransactionId", (q) => q.eq("plaidTransactionId", plaidId))
        .first()

      // Only delete if not split and not a child transaction
      if (tx && !tx.isSplit && !tx.parentTransactionId) {
        // Delete tag associations first
        const tags = await ctx.db
          .query("transactionTags")
          .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
          .collect()
        for (const tag of tags) {
          await ctx.db.delete(tag._id)
        }
        await ctx.db.delete(tx._id)
        count++
      }
    }
    return { count }
  },
})

// ============================================================================
// TAGS - Review tags for sync
// ============================================================================

export const getOrCreateReviewTags = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // Get or create for-review tag
    let forReviewTag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", "for-review"))
      .first()
    if (!forReviewTag) {
      const id = await ctx.db.insert("tags", {
        name: "for-review",
        color: "#f97316", // Orange
        createdAt: now,
        updatedAt: now,
      })
      forReviewTag = await ctx.db.get(id)
    }

    // Get or create sign-review tag
    let signReviewTag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", "sign-review"))
      .first()
    if (!signReviewTag) {
      const id = await ctx.db.insert("tags", {
        name: "sign-review",
        color: "#ef4444", // Red
        createdAt: now,
        updatedAt: now,
      })
      signReviewTag = await ctx.db.get(id)
    }

    return {
      forReviewTagId: forReviewTag!._id,
      signReviewTagId: signReviewTag!._id,
    }
  },
})

export const addTagsToTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, { transactionId, tagIds }) => {
    const now = Date.now()
    for (const tagId of tagIds) {
      // Check if association exists
      const existing = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
        .filter((q) => q.eq(q.field("tagId"), tagId))
        .first()

      if (!existing) {
        await ctx.db.insert("transactionTags", {
          transactionId,
          tagId,
          createdAt: now,
        })
      }
    }
  },
})

// ============================================================================
// SECURITIES - Investment securities
// ============================================================================

export const getAllSecuritiesWithTickers = query({
  args: {},
  handler: async (ctx) => {
    const securities = await ctx.db.query("securities").collect()
    return securities
      .filter((s) => s.tickerSymbol)
      .map((s) => ({
        id: s._id,
        plaidSecurityId: s.plaidSecurityId,
        tickerSymbol: s.tickerSymbol,
        name: s.name,
      }))
  },
})

export const getSecurityByPlaidId = query({
  args: { plaidSecurityId: v.string() },
  handler: async (ctx, { plaidSecurityId }) => {
    const security = await ctx.db
      .query("securities")
      .withIndex("by_plaidSecurityId", (q) => q.eq("plaidSecurityId", plaidSecurityId))
      .first()
    if (!security) return null
    return { id: security._id, plaidSecurityId: security.plaidSecurityId }
  },
})

export const upsertSecurity = mutation({
  args: {
    plaidSecurityId: v.string(),
    name: v.optional(v.string()),
    tickerSymbol: v.optional(v.string()),
    type: v.optional(v.string()),
    isoCurrencyCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("securities")
      .withIndex("by_plaidSecurityId", (q) => q.eq("plaidSecurityId", args.plaidSecurityId))
      .first()

    const now = Date.now()
    const data = {
      name: args.name,
      tickerSymbol: args.tickerSymbol,
      type: args.type,
      isoCurrencyCode: args.isoCurrencyCode,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { id: existing._id, isNew: false }
    } else {
      const id = await ctx.db.insert("securities", {
        plaidSecurityId: args.plaidSecurityId,
        ...data,
        createdAt: now,
      })
      return { id, isNew: true }
    }
  },
})

export const updateSecurityLogo = mutation({
  args: {
    id: v.id("securities"),
    logoUrl: v.string(),
  },
  handler: async (ctx, { id, logoUrl }) => {
    await ctx.db.patch(id, { logoUrl, updatedAt: Date.now() })
    return id
  },
})

// ============================================================================
// HOLDINGS - Investment holdings
// ============================================================================

export const getHoldingsByAccountIds = query({
  args: { accountIds: v.array(v.id("accounts")) },
  handler: async (ctx, { accountIds }) => {
    const holdings = []
    for (const accountId of accountIds) {
      const accountHoldings = await ctx.db
        .query("holdings")
        .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
        .collect()
      holdings.push(...accountHoldings)
    }

    // Get account and security info
    const result = await Promise.all(
      holdings.map(async (h) => {
        const account = await ctx.db.get(h.accountId)
        const security = await ctx.db.get(h.securityId)
        return {
          id: h._id,
          accountId: h.accountId,
          securityId: h.securityId,
          accountPlaidId: account?.plaidAccountId,
          securityPlaidId: security?.plaidSecurityId,
          institutionPrice: h.institutionPrice ?? null,
          institutionPriceAsOf: h.institutionPriceAsOf ?? null,
        }
      }),
    )
    return result
  },
})

export const getHoldingByAccountAndSecurity = query({
  args: {
    accountId: v.id("accounts"),
    securityId: v.id("securities"),
  },
  handler: async (ctx, { accountId, securityId }) => {
    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .filter((q) => q.eq(q.field("securityId"), securityId))
      .first()

    if (!holdings) return null
    return {
      id: holdings._id,
      institutionPrice: holdings.institutionPrice ?? null,
      institutionPriceAsOf: holdings.institutionPriceAsOf ?? null,
    }
  },
})

export const deleteHolding = mutation({
  args: { id: v.id("holdings") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
    return id
  },
})

export const upsertHolding = mutation({
  args: {
    accountId: v.id("accounts"),
    securityId: v.id("securities"),
    quantity: v.number(),
    costBasis: v.optional(v.number()),
    institutionPrice: v.optional(v.number()),
    institutionPriceAsOf: v.optional(v.number()),
    isoCurrencyCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("holdings")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.eq(q.field("securityId"), args.securityId))
      .first()

    const now = Date.now()
    const data = {
      quantity: args.quantity,
      costBasis: args.costBasis,
      institutionPrice: args.institutionPrice,
      institutionPriceAsOf: args.institutionPriceAsOf,
      isoCurrencyCode: args.isoCurrencyCode,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { id: existing._id, isNew: false }
    } else {
      const id = await ctx.db.insert("holdings", {
        accountId: args.accountId,
        securityId: args.securityId,
        ...data,
        createdAt: now,
      })
      return { id, isNew: true }
    }
  },
})

export const updateHoldingPrices = mutation({
  args: {
    securityId: v.id("securities"),
    institutionPrice: v.number(),
    institutionPriceAsOf: v.number(),
  },
  handler: async (ctx, { securityId, institutionPrice, institutionPriceAsOf }) => {
    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_securityId", (q) => q.eq("securityId", securityId))
      .collect()

    const now = Date.now()
    for (const holding of holdings) {
      await ctx.db.patch(holding._id, {
        institutionPrice,
        institutionPriceAsOf,
        updatedAt: now,
      })
    }
    return { updated: holdings.length }
  },
})

// ============================================================================
// INVESTMENT TRANSACTIONS
// ============================================================================

export const findInvestmentTransactionByPlaidId = query({
  args: { plaidInvestmentTransactionId: v.string() },
  handler: async (ctx, { plaidInvestmentTransactionId }) => {
    return ctx.db
      .query("investmentTransactions")
      .withIndex("by_plaidInvestmentTransactionId", (q) =>
        q.eq("plaidInvestmentTransactionId", plaidInvestmentTransactionId),
      )
      .first()
  },
})

export const upsertInvestmentTransaction = mutation({
  args: {
    plaidInvestmentTransactionId: v.string(),
    accountId: v.id("accounts"),
    securityId: v.optional(v.id("securities")),
    type: v.string(),
    amount: v.optional(v.number()),
    price: v.optional(v.number()),
    quantity: v.optional(v.number()),
    fees: v.optional(v.number()),
    isoCurrencyCode: v.optional(v.string()),
    date: v.number(),
    transactionDatetime: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("investmentTransactions")
      .withIndex("by_plaidInvestmentTransactionId", (q) =>
        q.eq("plaidInvestmentTransactionId", args.plaidInvestmentTransactionId),
      )
      .first()

    const now = Date.now()
    const data = {
      accountId: args.accountId,
      securityId: args.securityId,
      type: args.type,
      amount: args.amount,
      price: args.price,
      quantity: args.quantity,
      fees: args.fees,
      isoCurrencyCode: args.isoCurrencyCode,
      date: args.date,
      transactionDatetime: args.transactionDatetime,
      name: args.name,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { id: existing._id, isNew: false }
    } else {
      const id = await ctx.db.insert("investmentTransactions", {
        plaidInvestmentTransactionId: args.plaidInvestmentTransactionId,
        ...data,
        createdAt: now,
      })
      return { id, isNew: true }
    }
  },
})

// ============================================================================
// CATEGORIES - For AI categorization
// ============================================================================

export const getAllCategoriesWithSubcategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect()

    const result = await Promise.all(
      categories.map(async (cat) => {
        const subcategories = await ctx.db
          .query("subcategories")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", cat._id))
          .collect()

        return {
          id: cat._id,
          name: cat.name,
          groupType: cat.groupType ?? null,
          displayOrder: cat.displayOrder ?? 9999,
          subcategories: subcategories.map((sub) => ({
            id: sub._id,
            name: sub.name,
          })),
        }
      }),
    )

    return result.sort((a, b) => a.displayOrder - b.displayOrder)
  },
})

// ============================================================================
// TRANSACTIONS - For AI categorization
// ============================================================================

export const getRecentCategorizedTransactions = query({
  args: { limit: v.number(), excludeId: v.optional(v.id("transactions")) },
  handler: async (ctx, { limit, excludeId }) => {
    const transactions = await ctx.db.query("transactions").collect()

    // Filter: has category, not split
    let filtered = transactions.filter((tx) => tx.categoryId && !tx.isSplit)

    // Exclude specific transaction
    if (excludeId) {
      filtered = filtered.filter((tx) => tx._id !== excludeId)
    }

    // Sort by datetime desc and limit
    filtered.sort((a, b) => b.datetime.localeCompare(a.datetime))
    filtered = filtered.slice(0, limit)

    // Build result with category info
    const result = await Promise.all(
      filtered.map(async (tx) => {
        const category = tx.categoryId ? await ctx.db.get(tx.categoryId) : null
        const subcategory = tx.subcategoryId ? await ctx.db.get(tx.subcategoryId) : null

        return {
          name: tx.name,
          merchantName: tx.merchantName ?? null,
          amount: tx.amount,
          datetime: tx.datetime,
          category: category ? { id: category._id, name: category.name } : null,
          subcategory: subcategory ? { id: subcategory._id, name: subcategory.name } : null,
        }
      }),
    )

    return result
  },
})

export const getSimilarTransactions = query({
  args: {
    merchantName: v.optional(v.string()),
    name: v.string(),
    excludeId: v.optional(v.id("transactions")),
  },
  handler: async (ctx, { merchantName, name, excludeId }) => {
    const transactions = await ctx.db.query("transactions").collect()

    // Filter: has category, not split, matches merchant or name
    const namePrefix = name.slice(0, 10).toLowerCase()
    const merchantLower = merchantName?.toLowerCase()

    let filtered = transactions.filter((tx) => {
      if (!tx.categoryId || tx.isSplit) return false
      if (excludeId && tx._id === excludeId) return false

      // Match by merchant (exact, case insensitive)
      if (merchantLower && tx.merchantName?.toLowerCase() === merchantLower) return true

      // Match by name prefix
      if (tx.name.toLowerCase().includes(namePrefix)) return true

      return false
    })

    // Sort by datetime desc and limit
    filtered.sort((a, b) => b.datetime.localeCompare(a.datetime))
    filtered = filtered.slice(0, 50)

    // Build result with category info
    const result = await Promise.all(
      filtered.map(async (tx) => {
        const category = tx.categoryId ? await ctx.db.get(tx.categoryId) : null
        const subcategory = tx.subcategoryId ? await ctx.db.get(tx.subcategoryId) : null

        return {
          name: tx.name,
          merchantName: tx.merchantName ?? null,
          amount: tx.amount,
          datetime: tx.datetime,
          category: category ? { id: category._id, name: category.name } : null,
          subcategory: subcategory ? { id: subcategory._id, name: subcategory.name } : null,
        }
      }),
    )

    return result
  },
})

export const getTransactionForCategorization = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const tx = await ctx.db.get(id)
    if (!tx) return null

    return {
      id: tx._id,
      name: tx.name,
      merchantName: tx.merchantName ?? null,
      amount: tx.amount,
      date: tx.date,
      datetime: tx.datetime,
      plaidCategory: tx.plaidCategory ?? null,
      plaidSubcategory: tx.plaidSubcategory ?? null,
      notes: tx.notes ?? null,
      files: tx.files,
      categoryId: tx.categoryId ?? null,
    }
  },
})

export const getUncategorizedTransactions = query({
  args: { ids: v.array(v.id("transactions")) },
  handler: async (ctx, { ids }) => {
    const transactions = []
    for (const id of ids) {
      const tx = await ctx.db.get(id)
      if (tx && !tx.categoryId) {
        transactions.push({
          id: tx._id,
          name: tx.name,
          merchantName: tx.merchantName ?? null,
          amount: tx.amount,
          date: tx.date,
          plaidCategory: tx.plaidCategory ?? null,
          plaidSubcategory: tx.plaidSubcategory ?? null,
          notes: tx.notes ?? null,
        })
      }
    }
    return transactions
  },
})

export const applyCategorization = mutation({
  args: {
    transactionId: v.id("transactions"),
    categoryId: v.id("categories"),
    subcategoryId: v.optional(v.id("subcategories")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, { transactionId, categoryId, subcategoryId, tagIds }) => {
    const now = Date.now()

    // Update transaction
    await ctx.db.patch(transactionId, {
      categoryId,
      subcategoryId,
      updatedAt: now,
    })

    // Add tags if provided
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        const existing = await ctx.db
          .query("transactionTags")
          .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
          .filter((q) => q.eq(q.field("tagId"), tagId))
          .first()

        if (!existing) {
          await ctx.db.insert("transactionTags", {
            transactionId,
            tagId,
            createdAt: now,
          })
        }
      }
    }

    return transactionId
  },
})

// ============================================================================
// SMART ANALYSIS - Query for smart receipt analysis
// ============================================================================

export const getTransactionForSmartAnalysis = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const transaction = await ctx.db.get(id)
    if (!transaction) return null

    return {
      id: transaction._id,
      name: transaction.name,
      merchantName: transaction.merchantName ?? null,
      amount: transaction.amount,
      date: transaction.date,
      datetime: transaction.datetime ?? null,
      plaidCategory: transaction.plaidCategory ?? null,
      plaidSubcategory: transaction.plaidSubcategory ?? null,
      notes: transaction.notes ?? null,
      files: transaction.files ?? null,
      categoryId: transaction.categoryId ?? null,
      subcategoryId: transaction.subcategoryId ?? null,
    }
  },
})
