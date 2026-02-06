// convex/items.ts
// Item and institution queries and mutations

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get item by ID with accounts
 */
export const getById = query({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id)
    if (!item) return null

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_itemId", (q) => q.eq("itemId", id))
      .collect()

    // Never expose accessToken to clients
    const { accessToken: _token, ...safeItem } = item
    return {
      ...safeItem,
      id: item._id,
      accounts,
    }
  },
})

/**
 * Get item by Plaid item ID
 */
export const getByPlaidItemId = query({
  args: { plaidItemId: v.string() },
  handler: async (ctx, { plaidItemId }) => {
    return ctx.db
      .query("items")
      .withIndex("by_plaidItemId", (q) => q.eq("plaidItemId", plaidItemId))
      .first()
  },
})

/**
 * Get item by institution ID with accounts
 */
export const getByInstitutionId = query({
  args: { institutionId: v.id("institutions") },
  handler: async (ctx, { institutionId }) => {
    const item = await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("institutionId"), institutionId))
      .first()

    if (!item) return null

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
      .collect()

    // Never expose accessToken to clients
    const { accessToken: _token, ...safeItem } = item
    return {
      ...safeItem,
      id: item._id,
      accounts: accounts.map((a) => ({
        ...a,
        id: a._id,
      })),
    }
  },
})

/**
 * Get all items
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect()
    // Never expose accessToken to clients
    return items.map(({ accessToken: _token, ...safeItem }) => safeItem)
  },
})

/**
 * Get access token for an item (server-side only, used by API routes for Plaid calls)
 */
export const getAccessToken = query({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id)
    if (!item) return null
    return { accessToken: item.accessToken }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Upsert institution
 */
export const upsertInstitution = mutation({
  args: {
    oldId: v.string(), // Plaid institution ID
    name: v.string(),
    logoUrl: v.optional(v.string()),
    shortName: v.optional(v.string()),
  },
  handler: async (ctx, { oldId: plaidInstitutionId, name, logoUrl, shortName }) => {
    const now = Date.now()

    // Check if institution exists by plaidInstitutionId
    const existingByPlaidId = await ctx.db
      .query("institutions")
      .withIndex("by_plaidInstitutionId", (q) => q.eq("plaidInstitutionId", plaidInstitutionId))
      .first()

    if (existingByPlaidId) {
      await ctx.db.patch(existingByPlaidId._id, { name, logoUrl, shortName })
      return existingByPlaidId._id
    }

    // Check by name (fallback)
    const existingByName = await ctx.db
      .query("institutions")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first()

    if (existingByName) {
      await ctx.db.patch(existingByName._id, { name, logoUrl, shortName, plaidInstitutionId })
      return existingByName._id
    }

    // Create new
    return ctx.db.insert("institutions", {
      plaidInstitutionId,
      name,
      logoUrl,
      shortName,
      createdAt: now,
    })
  },
})

/**
 * Upsert item
 */
export const upsert = mutation({
  args: {
    plaidItemId: v.string(),
    accessToken: v.string(),
    institutionId: v.id("institutions"),
    status: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { plaidItemId, accessToken, institutionId, status }) => {
    const now = Date.now()

    const existing = await ctx.db
      .query("items")
      .withIndex("by_plaidItemId", (q) => q.eq("plaidItemId", plaidItemId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken,
        institutionId,
        status: status ?? undefined,
        updatedAt: now,
      })
      return existing._id
    }

    return ctx.db.insert("items", {
      plaidItemId,
      accessToken,
      institutionId,
      status: status ?? undefined,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update item with new plaidItemId and accessToken (for reconnection)
 */
export const updateForReconnection = mutation({
  args: {
    id: v.id("items"),
    plaidItemId: v.string(),
    accessToken: v.string(),
    status: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { id, plaidItemId, accessToken, status }) => {
    await ctx.db.patch(id, {
      plaidItemId,
      accessToken,
      status: status ?? undefined,
      lastTransactionsCursor: undefined,
      lastInvestmentsCursor: undefined,
      updatedAt: Date.now(),
    })
    return id
  },
})

/**
 * Update item status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("items"),
    status: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, {
      status: status ?? undefined,
      updatedAt: Date.now(),
    })
    return id
  },
})

/**
 * Clear all item cursors (for sync from scratch)
 */
export const clearAllCursors = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect()
    const now = Date.now()

    for (const item of items) {
      await ctx.db.patch(item._id, {
        lastTransactionsCursor: undefined,
        lastInvestmentsCursor: undefined,
        updatedAt: now,
      })
    }

    return { updated: items.length }
  },
})

/**
 * Delete non-manual transactions for an item (for reconnection)
 */
export const deleteNonManualTransactions = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    // Get all accounts for this item
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .collect()

    const accountIds = accounts.map((a) => a._id)
    let deleted = 0

    // Delete non-manual transactions for each account
    for (const accountId of accountIds) {
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
        .collect()

      for (const tx of transactions) {
        if (!tx.isManual) {
          // Delete tag associations first
          const tags = await ctx.db
            .query("transactionTags")
            .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
            .collect()
          for (const tag of tags) {
            await ctx.db.delete(tag._id)
          }
          await ctx.db.delete(tx._id)
          deleted++
        }
      }
    }

    return { deleted }
  },
})

/**
 * Convert split children to manual transactions (for reconnection)
 */
export const convertSplitChildrenToManual = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    // Get all accounts for this item
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .collect()

    const accountIds = accounts.map((a) => a._id)
    let converted = 0
    const now = Date.now()

    // Convert split children for each account
    for (const accountId of accountIds) {
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
        .collect()

      for (const tx of transactions) {
        if (tx.parentTransactionId && !tx.isManual) {
          await ctx.db.patch(tx._id, {
            isManual: true,
            parentTransactionId: undefined,
            updatedAt: now,
          })
          converted++
        }
      }
    }

    return { converted }
  },
})
