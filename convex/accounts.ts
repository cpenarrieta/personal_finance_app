// convex/accounts.ts
// Account queries - replaces src/lib/db/queries/accounts.ts

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number | undefined | null): string | null {
  if (!ts) return null
  return new Date(ts).toISOString()
}

/**
 * Get all accounts
 * Replaces: getAllAccounts()
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect()

    // Sort by name
    const sorted = accounts.sort((a, b) => a.name.localeCompare(b.name))

    return sorted.map((acc) => ({
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
    }))
  },
})

/**
 * Get all accounts with institution details
 * Replaces: getAllAccountsWithInstitution()
 */
export const getAllWithInstitution = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect()

    // Sort by name
    const sorted = accounts.sort((a, b) => a.name.localeCompare(b.name))

    const result = await Promise.all(
      sorted.map(async (acc) => {
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
                accessToken: item.accessToken,
                lastTransactionsCursor: item.lastTransactionsCursor ?? null,
                lastInvestmentsCursor: item.lastInvestmentsCursor ?? null,
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

    return result
  },
})

/**
 * Get account by ID with institution
 * Replaces: getAccountById()
 */
export const getById = query({
  args: { id: v.id("accounts") },
  handler: async (ctx, { id }) => {
    const acc = await ctx.db.get(id)
    if (!acc) return null

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
            accessToken: item.accessToken,
            lastTransactionsCursor: item.lastTransactionsCursor ?? null,
            lastInvestmentsCursor: item.lastInvestmentsCursor ?? null,
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
  },
})

/**
 * Get all connected Plaid items with institution info
 * Replaces: getAllConnectedItems()
 */
export const getAllConnectedItems = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect()

    // Sort by createdAt desc
    const sorted = items.sort((a, b) => b.createdAt - a.createdAt)

    const result = await Promise.all(
      sorted.map(async (item) => {
        const institution = item.institutionId ? await ctx.db.get(item.institutionId) : null

        const accounts = await ctx.db
          .query("accounts")
          .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
          .collect()

        return {
          id: item._id,
          plaidItemId: item.plaidItemId,
          accessToken: item.accessToken,
          status: item.status ?? null,
          created_at_string: formatTimestamp(item.createdAt),
          updated_at_string: formatTimestamp(item.updatedAt),
          institution: institution
            ? {
                id: institution._id,
                name: institution.name,
                logoUrl: institution.logoUrl ?? null,
                shortName: institution.shortName ?? null,
              }
            : null,
          accounts: accounts.map((acc) => ({
            id: acc._id,
            name: acc.name,
            type: acc.type,
            subtype: acc.subtype ?? null,
          })),
        }
      }),
    )

    return result
  },
})

/**
 * Get account by Plaid account ID
 */
export const getByPlaidAccountId = query({
  args: { plaidAccountId: v.string() },
  handler: async (ctx, { plaidAccountId }) => {
    return ctx.db
      .query("accounts")
      .withIndex("by_plaidAccountId", (q) => q.eq("plaidAccountId", plaidAccountId))
      .first()
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update account balances
 */
export const updateBalances = mutation({
  args: {
    id: v.id("accounts"),
    currentBalance: v.optional(v.number()),
    availableBalance: v.optional(v.number()),
    creditLimit: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...balances }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Account not found")

    await ctx.db.patch(id, {
      ...balances,
      balanceUpdatedAt: Date.now(),
      updatedAt: Date.now(),
    })
    return id
  },
})

/**
 * Update account name
 */
export const updateName = mutation({
  args: {
    id: v.id("accounts"),
    name: v.string(),
  },
  handler: async (ctx, { id, name }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Account not found")

    await ctx.db.patch(id, {
      name,
      updatedAt: Date.now(),
    })
    return id
  },
})

/**
 * Upsert account by Plaid account ID
 */
export const upsert = mutation({
  args: {
    plaidAccountId: v.string(),
    itemId: v.id("items"),
    name: v.string(),
    officialName: v.optional(v.union(v.string(), v.null())),
    mask: v.optional(v.union(v.string(), v.null())),
    type: v.string(),
    subtype: v.optional(v.union(v.string(), v.null())),
    currency: v.optional(v.union(v.string(), v.null())),
    currentBalance: v.optional(v.union(v.number(), v.null())),
    availableBalance: v.optional(v.union(v.number(), v.null())),
    creditLimit: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_plaidAccountId", (q) => q.eq("plaidAccountId", args.plaidAccountId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        itemId: args.itemId,
        name: args.name,
        officialName: args.officialName ?? undefined,
        mask: args.mask ?? undefined,
        type: args.type,
        subtype: args.subtype ?? undefined,
        currency: args.currency ?? undefined,
        currentBalance: args.currentBalance ?? undefined,
        availableBalance: args.availableBalance ?? undefined,
        creditLimit: args.creditLimit ?? undefined,
        balanceUpdatedAt: now,
        updatedAt: now,
      })
      return existing._id
    }

    return ctx.db.insert("accounts", {
      plaidAccountId: args.plaidAccountId,
      itemId: args.itemId,
      name: args.name,
      officialName: args.officialName ?? undefined,
      mask: args.mask ?? undefined,
      type: args.type,
      subtype: args.subtype ?? undefined,
      currency: args.currency ?? undefined,
      currentBalance: args.currentBalance ?? undefined,
      availableBalance: args.availableBalance ?? undefined,
      creditLimit: args.creditLimit ?? undefined,
      balanceUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update account with new Plaid account ID (for reconnection)
 */
export const updatePlaidAccountId = mutation({
  args: {
    id: v.id("accounts"),
    plaidAccountId: v.string(),
    officialName: v.optional(v.union(v.string(), v.null())),
    type: v.string(),
    subtype: v.optional(v.union(v.string(), v.null())),
    currency: v.optional(v.union(v.string(), v.null())),
    currentBalance: v.optional(v.union(v.number(), v.null())),
    availableBalance: v.optional(v.union(v.number(), v.null())),
    creditLimit: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const now = Date.now()

    await ctx.db.patch(id, {
      plaidAccountId: updates.plaidAccountId,
      officialName: updates.officialName ?? undefined,
      type: updates.type,
      subtype: updates.subtype ?? undefined,
      currency: updates.currency ?? undefined,
      currentBalance: updates.currentBalance ?? undefined,
      availableBalance: updates.availableBalance ?? undefined,
      creditLimit: updates.creditLimit ?? undefined,
      balanceUpdatedAt: now,
      updatedAt: now,
    })
    return id
  },
})

/**
 * Create new account
 */
export const create = mutation({
  args: {
    plaidAccountId: v.string(),
    itemId: v.id("items"),
    name: v.string(),
    officialName: v.optional(v.union(v.string(), v.null())),
    mask: v.optional(v.union(v.string(), v.null())),
    type: v.string(),
    subtype: v.optional(v.union(v.string(), v.null())),
    currency: v.optional(v.union(v.string(), v.null())),
    currentBalance: v.optional(v.union(v.number(), v.null())),
    availableBalance: v.optional(v.union(v.number(), v.null())),
    creditLimit: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    return ctx.db.insert("accounts", {
      plaidAccountId: args.plaidAccountId,
      itemId: args.itemId,
      name: args.name,
      officialName: args.officialName ?? undefined,
      mask: args.mask ?? undefined,
      type: args.type,
      subtype: args.subtype ?? undefined,
      currency: args.currency ?? undefined,
      currentBalance: args.currentBalance ?? undefined,
      availableBalance: args.availableBalance ?? undefined,
      creditLimit: args.creditLimit ?? undefined,
      balanceUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  },
})
