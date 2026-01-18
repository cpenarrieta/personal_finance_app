// convex/transactions.ts
// Transaction queries and mutations - replaces src/lib/db/queries/transactions.ts

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { Id, Doc } from "./_generated/dataModel"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number | undefined | null): string | null {
  if (!ts) return null
  return new Date(ts).toISOString()
}

// Helper to build transaction with relations
async function buildTransactionWithRelations(
  ctx: any,
  tx: Doc<"transactions">,
  options?: { includeFiles?: boolean; includeParentChild?: boolean },
) {
  const [account, category, subcategory, tagJunctions] = await Promise.all([
    ctx.db.get(tx.accountId),
    tx.categoryId ? ctx.db.get(tx.categoryId) : null,
    tx.subcategoryId ? ctx.db.get(tx.subcategoryId) : null,
    ctx.db
      .query("transactionTags")
      .withIndex("by_transactionId", (q: any) => q.eq("transactionId", tx._id))
      .collect(),
  ])

  // Fetch tags
  const tags = await Promise.all(tagJunctions.map((tj: Doc<"transactionTags">) => ctx.db.get(tj.tagId)))

  const result: any = {
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
          name: account.name,
          type: account.type,
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
    tags: tags.filter(Boolean).map((tag: Doc<"tags">) => ({
      id: tag._id,
      name: tag.name,
      color: tag.color,
      created_at_string: formatTimestamp(tag.createdAt),
      updated_at_string: formatTimestamp(tag.updatedAt),
    })),
  }

  if (options?.includeFiles) {
    result.files = tx.files
  }

  return result
}

/**
 * Get all transactions with full relations
 * Replaces: getAllTransactions()
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    // Get transactions where isSplit is false (filter out parent transactions)
    const transactions = await ctx.db.query("transactions").collect()

    // Filter and sort
    const filtered = transactions.filter((tx) => !tx.isSplit).sort((a, b) => b.datetime.localeCompare(a.datetime))

    const result = await Promise.all(filtered.map((tx) => buildTransactionWithRelations(ctx, tx)))

    return result
  },
})

/**
 * Get transactions for a specific account
 * Replaces: getTransactionsForAccount()
 */
export const getForAccount = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .collect()

    // Filter out split parents and sort by datetime desc
    const filtered = transactions.filter((tx) => !tx.isSplit).sort((a, b) => b.datetime.localeCompare(a.datetime))

    const result = await Promise.all(filtered.map((tx) => buildTransactionWithRelations(ctx, tx)))

    return result
  },
})

/**
 * Get transactions that need review (uncategorized or tagged for review)
 * Replaces: getReviewTransactions()
 */
export const getReviewTransactions = query({
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

    const reviewTagIds = [forReviewTag?._id, signReviewTag?._id].filter(Boolean) as Id<"tags">[]

    // Get all non-split transactions
    const transactions = await ctx.db.query("transactions").collect()

    const nonSplit = transactions.filter((tx) => !tx.isSplit)

    // Filter: uncategorized OR has review tags
    const reviewTransactions = await Promise.all(
      nonSplit.map(async (tx) => {
        // Check if uncategorized
        if (!tx.categoryId) return tx

        // Check if has review tags
        if (reviewTagIds.length > 0) {
          const txTags = await ctx.db
            .query("transactionTags")
            .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
            .collect()

          const hasReviewTag = txTags.some((tt) => reviewTagIds.includes(tt.tagId))
          if (hasReviewTag) return tx
        }

        return null
      }),
    )

    const filtered = reviewTransactions
      .filter(Boolean)
      .sort((a, b) => b!.datetime.localeCompare(a!.datetime)) as Doc<"transactions">[]

    const result = await Promise.all(filtered.map((tx) => buildTransactionWithRelations(ctx, tx)))

    return result
  },
})

/**
 * Get transaction by ID with full relations including parent/child
 * Replaces: getTransactionById()
 */
export const getById = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const tx = await ctx.db.get(id)
    if (!tx) return null

    const base = await buildTransactionWithRelations(ctx, tx, { includeFiles: true })

    // Get parent transaction if exists
    let parentTransaction = null
    if (tx.parentTransactionId) {
      const parent = await ctx.db.get(tx.parentTransactionId)
      if (parent) {
        const parentCategory = parent.categoryId ? await ctx.db.get(parent.categoryId) : null
        parentTransaction = {
          id: parent._id,
          name: parent.name,
          amount_number: parent.amount,
          datetime: parent.datetime,
          category: parentCategory ? { id: parentCategory._id, name: parentCategory.name } : null,
        }
      }
    }

    // Get child transactions if this is a split parent
    let childTransactions: any[] = []
    if (tx.isSplit) {
      const children = await ctx.db
        .query("transactions")
        .withIndex("by_parentTransactionId", (q) => q.eq("parentTransactionId", id))
        .collect()

      // Sort by createdAt asc
      const sortedChildren = children.sort((a, b) => a.createdAt - b.createdAt)

      childTransactions = await Promise.all(
        sortedChildren.map(async (child) => {
          const [childCategory, childSubcategory] = await Promise.all([
            child.categoryId ? ctx.db.get(child.categoryId) : null,
            child.subcategoryId ? ctx.db.get(child.subcategoryId) : null,
          ])

          return {
            id: child._id,
            name: child.name,
            amount_number: child.amount,
            datetime: child.datetime,
            category: childCategory ? { id: childCategory._id, name: childCategory.name } : null,
            subcategory: childSubcategory ? { id: childSubcategory._id, name: childSubcategory.name } : null,
          }
        }),
      )
    }

    return {
      ...base,
      files: tx.files,
      parentTransaction,
      childTransactions,
    }
  },
})

/**
 * Get transaction by Plaid transaction ID
 */
export const getByPlaidId = query({
  args: { plaidTransactionId: v.string() },
  handler: async (ctx, { plaidTransactionId }) => {
    return ctx.db
      .query("transactions")
      .withIndex("by_plaidTransactionId", (q) => q.eq("plaidTransactionId", plaidTransactionId))
      .first()
  },
})

/**
 * Get transactions by category (and optionally subcategory)
 * For move-transactions feature
 */
export const getByCategory = query({
  args: {
    categoryId: v.id("categories"),
    subcategoryId: v.optional(v.union(v.id("subcategories"), v.null())),
  },
  handler: async (ctx, { categoryId, subcategoryId }) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryId))
      .collect()

    // Filter by subcategoryId if provided
    let filtered = transactions.filter((tx) => !tx.isSplit)

    if (subcategoryId !== undefined) {
      if (subcategoryId === null) {
        // Only transactions with no subcategory
        filtered = filtered.filter((tx) => !tx.subcategoryId)
      } else {
        // Specific subcategory
        filtered = filtered.filter((tx) => tx.subcategoryId === subcategoryId)
      }
    }

    // Sort by datetime desc
    filtered.sort((a, b) => b.datetime.localeCompare(a.datetime))

    const result = await Promise.all(filtered.map((tx) => buildTransactionWithRelations(ctx, tx)))

    return result
  },
})

/**
 * Get recent transactions with optional limit
 */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const transactions = await ctx.db.query("transactions").collect()

    // Filter and sort
    const filtered = transactions
      .filter((tx) => !tx.isSplit)
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
      .slice(0, Math.min(limit, 500))

    const result = await Promise.all(filtered.map((tx) => buildTransactionWithRelations(ctx, tx)))

    return result
  },
})

/**
 * Get recent transactions for dashboard (with full relations)
 */
export const getRecentForDashboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const transactions = await ctx.db.query("transactions").collect()

    // Filter and sort
    const filtered = transactions
      .filter((tx) => !tx.isSplit)
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
      .slice(0, limit)

    const result = await Promise.all(filtered.map((tx) => buildTransactionWithRelations(ctx, tx)))

    return result
  },
})

/**
 * Get uncategorized transactions count and data
 */
export const getUncategorized = query({
  args: {},
  handler: async (ctx) => {
    const transactions = await ctx.db.query("transactions").collect()

    // Filter for uncategorized, non-split transactions
    const uncategorized = transactions.filter((tx) => !tx.categoryId && !tx.isSplit)

    const uncategorizedCount = uncategorized.length

    if (uncategorizedCount === 0) {
      return { uncategorizedCount: 0, uncategorizedTransactions: [] }
    }

    // Sort by datetime desc
    const sorted = uncategorized.sort((a, b) => b.datetime.localeCompare(a.datetime))

    // Build full transaction objects
    const uncategorizedTransactions = await Promise.all(sorted.map((tx) => buildTransactionWithRelations(ctx, tx)))

    return { uncategorizedCount, uncategorizedTransactions }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a manual transaction
 */
export const create = mutation({
  args: {
    accountId: v.id("accounts"),
    name: v.string(),
    amount: v.number(),
    date: v.string(),
    pending: v.boolean(),
    merchantName: v.optional(v.string()),
    isoCurrencyCode: v.optional(v.string()),
    authorizedDate: v.optional(v.string()),
    plaidCategory: v.optional(v.string()),
    plaidSubcategory: v.optional(v.string()),
    paymentChannel: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    subcategoryId: v.optional(v.id("subcategories")),
    notes: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const dateTs = new Date(args.date).getTime()
    const authorizedDateTs = args.authorizedDate ? new Date(args.authorizedDate).getTime() : undefined

    // Generate unique plaidTransactionId for manual transactions
    const plaidTransactionId = `manual_${now}_${Math.random().toString(36).substring(7)}`

    const transactionId = await ctx.db.insert("transactions", {
      plaidTransactionId,
      accountId: args.accountId,
      name: args.name,
      amount: args.amount,
      date: dateTs,
      datetime: args.date,
      authorizedDate: authorizedDateTs,
      authorizedDatetime: args.authorizedDate,
      pending: args.pending,
      merchantName: args.merchantName,
      isoCurrencyCode: args.isoCurrencyCode,
      plaidCategory: args.plaidCategory,
      plaidSubcategory: args.plaidSubcategory,
      paymentChannel: args.paymentChannel,
      categoryId: args.categoryId,
      subcategoryId: args.subcategoryId,
      notes: args.notes,
      files: [],
      isSplit: false,
      isManual: true,
      createdAt: now,
      updatedAt: now,
    })

    // Add tags if provided
    if (args.tagIds && args.tagIds.length > 0) {
      for (const tagId of args.tagIds) {
        await ctx.db.insert("transactionTags", {
          transactionId,
          tagId,
          createdAt: now,
        })
      }
    }

    return transactionId
  },
})

/**
 * Update a single transaction
 */
export const update = mutation({
  args: {
    id: v.id("transactions"),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    subcategoryId: v.optional(v.union(v.id("subcategories"), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    name: v.optional(v.string()),
    merchantName: v.optional(v.union(v.string(), v.null())),
    files: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Transaction not found")

    // Build update object, filtering out undefined values
    const updateData: any = { updatedAt: Date.now() }
    if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId ?? undefined
    if (updates.subcategoryId !== undefined) updateData.subcategoryId = updates.subcategoryId ?? undefined
    if (updates.notes !== undefined) updateData.notes = updates.notes ?? undefined
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.merchantName !== undefined) updateData.merchantName = updates.merchantName ?? undefined
    if (updates.files !== undefined) updateData.files = updates.files

    await ctx.db.patch(id, updateData)
    return id
  },
})

/**
 * Bulk update transactions (category, subcategory)
 */
export const bulkUpdate = mutation({
  args: {
    transactionIds: v.array(v.id("transactions")),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    subcategoryId: v.optional(v.union(v.id("subcategories"), v.null())),
  },
  handler: async (ctx, { transactionIds, categoryId, subcategoryId }) => {
    const now = Date.now()

    for (const id of transactionIds) {
      const updateData: any = { updatedAt: now }
      if (categoryId !== undefined) updateData.categoryId = categoryId ?? undefined
      if (subcategoryId !== undefined) updateData.subcategoryId = subcategoryId ?? undefined

      await ctx.db.patch(id, updateData)
    }

    return { updated: transactionIds.length }
  },
})

/**
 * Add tags to transactions
 */
export const addTags = mutation({
  args: {
    transactionIds: v.array(v.id("transactions")),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, { transactionIds, tagIds }) => {
    const now = Date.now()
    let added = 0

    for (const transactionId of transactionIds) {
      for (const tagId of tagIds) {
        // Check if association already exists
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
          added++
        }
      }
    }

    return { added }
  },
})

/**
 * Remove tags from transactions
 */
export const removeTags = mutation({
  args: {
    transactionIds: v.array(v.id("transactions")),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, { transactionIds, tagIds }) => {
    let removed = 0

    for (const transactionId of transactionIds) {
      for (const tagId of tagIds) {
        const existing = await ctx.db
          .query("transactionTags")
          .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
          .filter((q) => q.eq(q.field("tagId"), tagId))
          .first()

        if (existing) {
          await ctx.db.delete(existing._id)
          removed++
        }
      }
    }

    return { removed }
  },
})

/**
 * Set tags for a transaction (replace all existing)
 */
export const setTags = mutation({
  args: {
    transactionId: v.id("transactions"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, { transactionId, tagIds }) => {
    const now = Date.now()

    // Delete all existing associations
    const existing = await ctx.db
      .query("transactionTags")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
      .collect()

    for (const assoc of existing) {
      await ctx.db.delete(assoc._id)
    }

    // Create new associations
    for (const tagId of tagIds) {
      await ctx.db.insert("transactionTags", {
        transactionId,
        tagId,
        createdAt: now,
      })
    }

    return { set: tagIds.length }
  },
})

/**
 * Create a split transaction
 */
export const createSplit = mutation({
  args: {
    parentId: v.id("transactions"),
    splits: v.array(
      v.object({
        name: v.string(),
        amount: v.number(),
        categoryId: v.optional(v.id("categories")),
        subcategoryId: v.optional(v.id("subcategories")),
      }),
    ),
  },
  handler: async (ctx, { parentId, splits }) => {
    const parent = await ctx.db.get(parentId)
    if (!parent) throw new Error("Parent transaction not found")

    const now = Date.now()

    // Mark parent as split
    await ctx.db.patch(parentId, {
      isSplit: true,
      updatedAt: now,
    })

    // Create child transactions
    const childIds: Id<"transactions">[] = []
    for (const split of splits) {
      const childId = await ctx.db.insert("transactions", {
        plaidTransactionId: `${parent.plaidTransactionId}-split-${Date.now()}-${Math.random()}`,
        accountId: parent.accountId,
        amount: split.amount,
        isoCurrencyCode: parent.isoCurrencyCode,
        date: parent.date,
        authorizedDate: parent.authorizedDate,
        datetime: parent.datetime,
        authorizedDatetime: parent.authorizedDatetime,
        pending: parent.pending,
        merchantName: parent.merchantName,
        name: split.name,
        plaidCategory: parent.plaidCategory,
        plaidSubcategory: parent.plaidSubcategory,
        paymentChannel: parent.paymentChannel,
        pendingTransactionId: parent.pendingTransactionId,
        logoUrl: parent.logoUrl,
        categoryIconUrl: parent.categoryIconUrl,
        categoryId: split.categoryId,
        subcategoryId: split.subcategoryId,
        notes: undefined,
        files: [],
        isSplit: false,
        isManual: false,
        parentTransactionId: parentId,
        originalTransactionId: parent.plaidTransactionId,
        createdAt: now,
        updatedAt: now,
      })
      childIds.push(childId)
    }

    return { parentId, childIds }
  },
})

/**
 * Delete split children and restore parent
 */
export const unsplit = mutation({
  args: { parentId: v.id("transactions") },
  handler: async (ctx, { parentId }) => {
    const parent = await ctx.db.get(parentId)
    if (!parent) throw new Error("Parent transaction not found")
    if (!parent.isSplit) throw new Error("Transaction is not split")

    // Delete all child transactions
    const children = await ctx.db
      .query("transactions")
      .withIndex("by_parentTransactionId", (q) => q.eq("parentTransactionId", parentId))
      .collect()

    for (const child of children) {
      // Delete child's tag associations
      const childTags = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", child._id))
        .collect()
      for (const tt of childTags) {
        await ctx.db.delete(tt._id)
      }
      await ctx.db.delete(child._id)
    }

    // Restore parent
    await ctx.db.patch(parentId, {
      isSplit: false,
      updatedAt: Date.now(),
    })

    return { restored: parentId, deleted: children.length }
  },
})

/**
 * Confirm and save transaction updates from review
 * - Updates category, subcategory, notes, amount, and tags
 * - Removes "for-review" and "sign-review" tags
 */
export const confirmTransactions = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("transactions"),
        categoryId: v.union(v.id("categories"), v.null()),
        subcategoryId: v.union(v.id("subcategories"), v.null()),
        notes: v.union(v.string(), v.null()),
        newAmount: v.union(v.number(), v.null()),
        tagIds: v.array(v.id("tags")),
      }),
    ),
  },
  handler: async (ctx, { updates }) => {
    const now = Date.now()

    // Get review tags to remove
    const forReviewTag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", "for-review"))
      .first()
    const signReviewTag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", "sign-review"))
      .first()
    const reviewTagIds = [forReviewTag?._id, signReviewTag?._id].filter((id): id is Id<"tags"> => !!id)

    for (const update of updates) {
      // Update the transaction
      await ctx.db.patch(update.id, {
        categoryId: update.categoryId ?? undefined,
        subcategoryId: update.subcategoryId ?? undefined,
        notes: update.notes ?? undefined,
        ...(update.newAmount !== null ? { amount: update.newAmount * -1 } : {}),
        updatedAt: now,
      })

      // Get current tags for this transaction
      const currentTagJunctions = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", update.id))
        .collect()
      const currentTagIds = currentTagJunctions.map((tj) => tj.tagId)

      // Remove review tags
      for (const tj of currentTagJunctions) {
        if (reviewTagIds.includes(tj.tagId)) {
          await ctx.db.delete(tj._id)
        }
      }

      // Calculate tags to add and remove (excluding review tags)
      const nonReviewCurrentTags = currentTagIds.filter((id) => !reviewTagIds.includes(id))
      const tagsToAdd = update.tagIds.filter((id) => !nonReviewCurrentTags.includes(id))
      const tagsToRemove = nonReviewCurrentTags.filter((id) => !update.tagIds.includes(id))

      // Add new tags
      for (const tagId of tagsToAdd) {
        await ctx.db.insert("transactionTags", {
          transactionId: update.id,
          tagId,
          createdAt: now,
        })
      }

      // Remove old tags
      for (const tagId of tagsToRemove) {
        const junction = currentTagJunctions.find((tj) => tj.tagId === tagId)
        if (junction) {
          await ctx.db.delete(junction._id)
        }
      }
    }

    return { success: true, updatedCount: updates.length }
  },
})

/**
 * Update transaction with tags replacement
 */
export const updateWithTags = mutation({
  args: {
    id: v.id("transactions"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    plaidCategory: v.optional(v.union(v.string(), v.null())),
    plaidSubcategory: v.optional(v.union(v.string(), v.null())),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    subcategoryId: v.optional(v.union(v.id("subcategories"), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    files: v.optional(v.array(v.string())),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, { id, tagIds, ...updates }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Transaction not found")

    const now = Date.now()

    // Build update object
    const updateData: any = { updatedAt: now }
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.amount !== undefined) updateData.amount = updates.amount
    if (updates.plaidCategory !== undefined) updateData.plaidCategory = updates.plaidCategory ?? undefined
    if (updates.plaidSubcategory !== undefined) updateData.plaidSubcategory = updates.plaidSubcategory ?? undefined
    if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId ?? undefined
    if (updates.subcategoryId !== undefined) updateData.subcategoryId = updates.subcategoryId ?? undefined
    if (updates.notes !== undefined) updateData.notes = updates.notes ?? undefined
    if (updates.files !== undefined) updateData.files = updates.files

    await ctx.db.patch(id, updateData)

    // Handle tags if provided
    if (tagIds !== undefined) {
      // Delete all existing tag associations
      const existingTags = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", id))
        .collect()
      for (const tag of existingTags) {
        await ctx.db.delete(tag._id)
      }

      // Create new tag associations
      for (const tagId of tagIds) {
        await ctx.db.insert("transactionTags", {
          transactionId: id,
          tagId,
          createdAt: now,
        })
      }
    }

    return id
  },
})

/**
 * Delete a transaction and its children/tags
 */
export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const transaction = await ctx.db.get(id)
    if (!transaction) throw new Error("Transaction not found")

    // Delete child transactions (if this is a split parent)
    const children = await ctx.db
      .query("transactions")
      .withIndex("by_parentTransactionId", (q) => q.eq("parentTransactionId", id))
      .collect()

    for (const child of children) {
      // Delete child's tags first
      const childTags = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", child._id))
        .collect()
      for (const tag of childTags) {
        await ctx.db.delete(tag._id)
      }
      await ctx.db.delete(child._id)
    }

    // Delete this transaction's tags
    const tags = await ctx.db
      .query("transactionTags")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", id))
      .collect()
    for (const tag of tags) {
      await ctx.db.delete(tag._id)
    }

    // Delete the transaction
    await ctx.db.delete(id)

    return { deleted: true }
  },
})

/**
 * Split a transaction into multiple child transactions
 */
export const split = mutation({
  args: {
    id: v.id("transactions"),
    splits: v.array(
      v.object({
        amount: v.number(),
        categoryId: v.optional(v.union(v.id("categories"), v.null())),
        subcategoryId: v.optional(v.union(v.id("subcategories"), v.null())),
        notes: v.optional(v.union(v.string(), v.null())),
        description: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { id, splits }) => {
    const original = await ctx.db.get(id)
    if (!original) throw new Error("Transaction not found")
    if (original.isSplit) throw new Error("Transaction has already been split")

    const now = Date.now()

    // Mark original as split
    await ctx.db.patch(id, {
      isSplit: true,
      updatedAt: now,
    })

    // Create child transactions
    const childTransactions: Array<{ _id: Id<"transactions">; amount: number; name: string }> = []
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i]!
      const childId = await ctx.db.insert("transactions", {
        plaidTransactionId: `${original.plaidTransactionId}_split_${i + 1}_${now}`,
        accountId: original.accountId,
        amount: split.amount,
        isoCurrencyCode: original.isoCurrencyCode,
        date: original.date,
        datetime: original.datetime,
        authorizedDate: original.authorizedDate,
        authorizedDatetime: original.authorizedDatetime,
        pending: original.pending,
        merchantName: original.merchantName,
        name: split.description || `${original.name} (Split ${i + 1}/${splits.length})`,
        plaidCategory: original.plaidCategory,
        plaidSubcategory: original.plaidSubcategory,
        paymentChannel: original.paymentChannel,
        logoUrl: original.logoUrl,
        categoryIconUrl: original.categoryIconUrl,
        categoryId: split.categoryId ?? undefined,
        subcategoryId: split.subcategoryId ?? undefined,
        notes: split.notes ?? undefined,
        files: [],
        parentTransactionId: id,
        originalTransactionId: id,
        isSplit: false,
        isManual: false,
        createdAt: now,
        updatedAt: now,
      })
      childTransactions.push({
        _id: childId,
        amount: split.amount,
        name: split.description || `${original.name} (Split ${i + 1}/${splits.length})`,
      })
    }

    return {
      original: { _id: id, isSplit: true },
      children: childTransactions,
    }
  },
})

/**
 * AI-generated split with automatic tagging
 */
export const aiSplit = mutation({
  args: {
    id: v.id("transactions"),
    splits: v.array(
      v.object({
        categoryId: v.id("categories"),
        subcategoryId: v.union(v.id("subcategories"), v.null()),
        amount: v.number(),
        description: v.string(),
        reasoning: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { id, splits }) => {
    const original = await ctx.db.get(id)
    if (!original) throw new Error("Transaction not found")
    if (original.isSplit) throw new Error("Transaction has already been split")

    const now = Date.now()

    // Ensure "ai-split" tag exists
    let aiSplitTag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", "ai-split"))
      .first()

    if (!aiSplitTag) {
      const tagId = await ctx.db.insert("tags", {
        name: "ai-split",
        color: "#8b5cf6", // Purple
        createdAt: now,
        updatedAt: now,
      })
      aiSplitTag = await ctx.db.get(tagId)
    }

    // Mark original as split and add ai-split tag
    await ctx.db.patch(id, {
      isSplit: true,
      updatedAt: now,
    })

    // Add ai-split tag to original
    await ctx.db.insert("transactionTags", {
      transactionId: id,
      tagId: aiSplitTag!._id,
      createdAt: now,
    })

    // Create child transactions
    const childTransactions: Array<{ _id: Id<"transactions">; amount: number; name: string }> = []
    const isExpense = original.amount > 0

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i]!
      // Preserve the sign based on original transaction
      const signedAmount = isExpense ? split.amount : split.amount * -1

      const childId = await ctx.db.insert("transactions", {
        plaidTransactionId: `${original.plaidTransactionId}_ai_split_${i + 1}_${now}`,
        accountId: original.accountId,
        amount: signedAmount,
        isoCurrencyCode: original.isoCurrencyCode,
        date: original.date,
        datetime: original.datetime,
        authorizedDate: original.authorizedDate,
        authorizedDatetime: original.authorizedDatetime,
        pending: original.pending,
        merchantName: original.merchantName,
        name: split.description,
        plaidCategory: original.plaidCategory,
        plaidSubcategory: original.plaidSubcategory,
        paymentChannel: original.paymentChannel,
        logoUrl: original.logoUrl,
        categoryIconUrl: original.categoryIconUrl,
        categoryId: split.categoryId,
        subcategoryId: split.subcategoryId ?? undefined,
        notes: split.reasoning ?? undefined,
        files: [],
        parentTransactionId: id,
        originalTransactionId: id,
        isSplit: false,
        isManual: false,
        createdAt: now,
        updatedAt: now,
      })

      // Add ai-split tag to child
      await ctx.db.insert("transactionTags", {
        transactionId: childId,
        tagId: aiSplitTag!._id,
        createdAt: now,
      })

      childTransactions.push({
        _id: childId,
        amount: signedAmount,
        name: split.description,
      })
    }

    return {
      original: { _id: id, isSplit: true },
      children: childTransactions,
    }
  },
})

/**
 * Bulk update transactions with category/subcategory and tag replacement
 */
export const bulkUpdateWithTags = mutation({
  args: {
    transactionIds: v.array(v.id("transactions")),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    subcategoryId: v.optional(v.union(v.id("subcategories"), v.null())),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, { transactionIds, categoryId, subcategoryId, tagIds }) => {
    const now = Date.now()

    // Update transactions
    for (const id of transactionIds) {
      const updateData: any = { updatedAt: now }
      if (categoryId !== undefined) updateData.categoryId = categoryId ?? undefined
      if (subcategoryId !== undefined) updateData.subcategoryId = subcategoryId ?? undefined
      await ctx.db.patch(id, updateData)
    }

    // Handle tags if provided
    if (tagIds !== undefined) {
      for (const transactionId of transactionIds) {
        // Delete all existing tag associations
        const existingTags = await ctx.db
          .query("transactionTags")
          .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
          .collect()
        for (const tag of existingTags) {
          await ctx.db.delete(tag._id)
        }

        // Create new tag associations
        for (const tagId of tagIds) {
          await ctx.db.insert("transactionTags", {
            transactionId,
            tagId,
            createdAt: now,
          })
        }
      }
    }

    return { updatedCount: transactionIds.length }
  },
})

/**
 * Get transactions by IDs for export
 */
export const getByIds = query({
  args: { ids: v.array(v.id("transactions")) },
  handler: async (ctx, { ids }) => {
    const transactions = await Promise.all(
      ids.map(async (id) => {
        const tx = await ctx.db.get(id)
        if (!tx) return null

        const [account, category, subcategory, tagJunctions] = await Promise.all([
          ctx.db.get(tx.accountId),
          tx.categoryId ? ctx.db.get(tx.categoryId) : null,
          tx.subcategoryId ? ctx.db.get(tx.subcategoryId) : null,
          ctx.db
            .query("transactionTags")
            .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
            .collect(),
        ])

        // Fetch tags
        const tags = await Promise.all(tagJunctions.map((tj: Doc<"transactionTags">) => ctx.db.get(tj.tagId)))

        // Get item for account
        let item = null
        if (account?.itemId) {
          item = await ctx.db.get(account.itemId)
        }

        return {
          id: tx._id,
          plaidTransactionId: tx.plaidTransactionId,
          pendingTransactionId: tx.pendingTransactionId ?? null,
          accountId: tx.accountId,
          amount_number: tx.amount,
          isoCurrencyCode: tx.isoCurrencyCode ?? null,
          datetime: tx.datetime,
          authorizedDatetime: tx.authorizedDatetime ?? null,
          pending: tx.pending,
          merchantName: tx.merchantName ?? null,
          name: tx.name,
          categoryId: tx.categoryId ?? null,
          subcategoryId: tx.subcategoryId ?? null,
          paymentChannel: tx.paymentChannel ?? null,
          notes: tx.notes ?? null,
          isManual: tx.isManual ?? false,
          isSplit: tx.isSplit,
          parentTransactionId: tx.parentTransactionId ?? null,
          originalTransactionId: tx.originalTransactionId ?? null,
          logoUrl: tx.logoUrl ?? null,
          categoryIconUrl: tx.categoryIconUrl ?? null,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
          account: account
            ? {
                id: account._id,
                plaidAccountId: account.plaidAccountId,
                itemId: account.itemId,
                name: account.name,
                type: account.type,
                mask: account.mask ?? null,
                item: item ? { institutionId: item.institutionId ?? null } : null,
              }
            : null,
          category: category ? { id: category._id, name: category.name } : null,
          subcategory: subcategory ? { id: subcategory._id, name: subcategory.name } : null,
          tags: tags
            .filter((tag): tag is Doc<"tags"> => tag !== null)
            .map((tag) => ({
              id: tag._id,
              name: tag.name,
            })),
        }
      }),
    )

    // Filter nulls and maintain order from input ids
    return transactions.filter(Boolean)
  },
})
