// convex/categories.ts
// Category queries - replaces src/lib/db/queries/categories.ts

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString()
}

/**
 * Get all categories with subcategories
 * Replaces: getAllCategories()
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect()

    // Sort by groupType, displayOrder, name
    const sorted = categories.sort((a, b) => {
      // Group type order: EXPENSES, INCOME, INVESTMENT, TRANSFER, null
      const groupOrder = ["EXPENSES", "INCOME", "INVESTMENT", "TRANSFER"]
      const aGroupIdx = a.groupType ? groupOrder.indexOf(a.groupType) : 999
      const bGroupIdx = b.groupType ? groupOrder.indexOf(b.groupType) : 999
      if (aGroupIdx !== bGroupIdx) return aGroupIdx - bGroupIdx

      // Then by displayOrder
      const aOrder = a.displayOrder ?? 999
      const bOrder = b.displayOrder ?? 999
      if (aOrder !== bOrder) return aOrder - bOrder

      // Then by name
      return a.name.localeCompare(b.name)
    })

    // Fetch subcategories for each category
    const result = await Promise.all(
      sorted.map(async (cat) => {
        const subcategories = await ctx.db
          .query("subcategories")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", cat._id))
          .collect()

        // Sort subcategories by name
        const sortedSubs = subcategories.sort((a, b) => a.name.localeCompare(b.name))

        return {
          id: cat._id,
          name: cat.name,
          imageUrl: cat.imageUrl ?? null,
          groupType: cat.groupType ?? null,
          displayOrder: cat.displayOrder ?? null,
          created_at_string: formatTimestamp(cat.createdAt),
          updated_at_string: formatTimestamp(cat.updatedAt),
          subcategories: sortedSubs.map((sub) => ({
            id: sub._id,
            categoryId: sub.categoryId,
            name: sub.name,
            imageUrl: sub.imageUrl ?? null,
            created_at_string: formatTimestamp(sub.createdAt),
            updated_at_string: formatTimestamp(sub.updatedAt),
          })),
        }
      }),
    )

    return result
  },
})

/**
 * Get all categories for management (full data)
 * Replaces: getAllCategoriesForManagement()
 */
export const getAllForManagement = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect()

    // Sort by name
    const sorted = categories.sort((a, b) => a.name.localeCompare(b.name))

    const result = await Promise.all(
      sorted.map(async (cat) => {
        const subcategories = await ctx.db
          .query("subcategories")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", cat._id))
          .collect()

        return {
          ...cat,
          id: cat._id,
          subcategories: subcategories.map((sub) => ({
            ...sub,
            id: sub._id,
          })),
        }
      }),
    )

    return result
  },
})

/**
 * Get category by ID
 */
export const getById = query({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const category = await ctx.db.get(id)
    if (!category) return null

    const subcategories = await ctx.db
      .query("subcategories")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", id))
      .collect()

    return {
      id: category._id,
      name: category.name,
      imageUrl: category.imageUrl ?? null,
      groupType: category.groupType ?? null,
      displayOrder: category.displayOrder ?? null,
      created_at_string: formatTimestamp(category.createdAt),
      updated_at_string: formatTimestamp(category.updatedAt),
      subcategories: subcategories.map((sub) => ({
        id: sub._id,
        categoryId: sub.categoryId,
        name: sub.name,
        imageUrl: sub.imageUrl ?? null,
        created_at_string: formatTimestamp(sub.createdAt),
        updated_at_string: formatTimestamp(sub.updatedAt),
      })),
    }
  },
})

/**
 * Get subcategory by ID
 */
export const getSubcategoryById = query({
  args: { id: v.id("subcategories") },
  handler: async (ctx, { id }) => {
    const subcategory = await ctx.db.get(id)
    if (!subcategory) return null

    return {
      id: subcategory._id,
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      imageUrl: subcategory.imageUrl ?? null,
      created_at_string: formatTimestamp(subcategory.createdAt),
      updated_at_string: formatTimestamp(subcategory.updatedAt),
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new category
 */
export const create = mutation({
  args: {
    name: v.string(),
    imageUrl: v.optional(v.string()),
    groupType: v.optional(
      v.union(v.literal("EXPENSES"), v.literal("INCOME"), v.literal("INVESTMENT"), v.literal("TRANSFER")),
    ),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const id = await ctx.db.insert("categories", {
      name: args.name,
      imageUrl: args.imageUrl,
      groupType: args.groupType,
      displayOrder: args.displayOrder,
      createdAt: now,
      updatedAt: now,
    })
    return id
  },
})

/**
 * Update a category
 */
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    groupType: v.optional(
      v.union(v.literal("EXPENSES"), v.literal("INCOME"), v.literal("INVESTMENT"), v.literal("TRANSFER")),
    ),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Category not found")

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
    return id
  },
})

/**
 * Delete a category and its subcategories
 */
export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    // Delete subcategories first
    const subcategories = await ctx.db
      .query("subcategories")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", id))
      .collect()

    for (const sub of subcategories) {
      await ctx.db.delete(sub._id)
    }

    // Delete category
    await ctx.db.delete(id)
    return id
  },
})

// ============================================================================
// SUBCATEGORY MUTATIONS
// ============================================================================

/**
 * Create a subcategory
 */
export const createSubcategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId)
    if (!category) throw new Error("Category not found")

    const now = Date.now()
    const id = await ctx.db.insert("subcategories", {
      categoryId: args.categoryId,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
    })
    return id
  },
})

/**
 * Update a subcategory
 */
export const updateSubcategory = mutation({
  args: {
    id: v.id("subcategories"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Subcategory not found")

    if (updates.categoryId) {
      const category = await ctx.db.get(updates.categoryId)
      if (!category) throw new Error("Category not found")
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
    return id
  },
})

/**
 * Delete a subcategory
 */
export const removeSubcategory = mutation({
  args: { id: v.id("subcategories") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
    return id
  },
})

/**
 * Bulk update category order and groupType
 */
export const updateOrder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("categories"),
        groupType: v.optional(
          v.union(v.literal("EXPENSES"), v.literal("INCOME"), v.literal("INVESTMENT"), v.literal("TRANSFER"), v.null()),
        ),
        displayOrder: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { updates }) => {
    const now = Date.now()
    for (const update of updates) {
      const existing = await ctx.db.get(update.id)
      if (!existing) continue

      await ctx.db.patch(update.id, {
        groupType: update.groupType === null ? undefined : update.groupType,
        displayOrder: update.displayOrder,
        updatedAt: now,
      })
    }
    return { success: true }
  },
})
