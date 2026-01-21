// convex/tags.ts
// Tag queries - replaces src/lib/db/queries/tags.ts

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString()
}

/**
 * Get all tags
 * Replaces: getAllTags()
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const tags = await ctx.db.query("tags").collect()

    // Sort by name
    const sorted = tags.sort((a, b) => a.name.localeCompare(b.name))

    return sorted.map((tag) => ({
      id: tag._id,
      name: tag.name,
      color: tag.color,
      created_at_string: formatTimestamp(tag.createdAt),
      updated_at_string: formatTimestamp(tag.updatedAt),
    }))
  },
})

/**
 * Get all tags with transaction counts
 * Replaces: getAllTagsWithCounts()
 */
export const getAllWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const tags = await ctx.db.query("tags").collect()

    // Sort by name
    const sorted = tags.sort((a, b) => a.name.localeCompare(b.name))

    // Get transaction counts for each tag
    const result = await Promise.all(
      sorted.map(async (tag) => {
        const transactionTags = await ctx.db
          .query("transactionTags")
          .withIndex("by_tagId", (q) => q.eq("tagId", tag._id))
          .collect()

        return {
          id: tag._id,
          name: tag.name,
          color: tag.color,
          createdAt: tag.createdAt,
          updatedAt: tag.updatedAt,
          _count: {
            transactions: transactionTags.length,
          },
        }
      }),
    )

    return result
  },
})

/**
 * Get tag by ID
 */
export const getById = query({
  args: { id: v.id("tags") },
  handler: async (ctx, { id }) => {
    const tag = await ctx.db.get(id)
    if (!tag) return null

    return {
      id: tag._id,
      name: tag.name,
      color: tag.color,
      created_at_string: formatTimestamp(tag.createdAt),
      updated_at_string: formatTimestamp(tag.updatedAt),
    }
  },
})

/**
 * Get tag by name
 */
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const tag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first()

    if (!tag) return null

    return {
      id: tag._id,
      name: tag.name,
      color: tag.color,
      created_at_string: formatTimestamp(tag.createdAt),
      updated_at_string: formatTimestamp(tag.updatedAt),
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new tag
 */
export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if tag with same name exists
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first()

    if (existing) {
      throw new Error(`Tag with name "${args.name}" already exists`)
    }

    const now = Date.now()
    const id = await ctx.db.insert("tags", {
      name: args.name,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    })
    return id
  },
})

/**
 * Update a tag
 */
export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Tag not found")

    // Check for duplicate name if updating name
    if (updates.name && updates.name !== existing.name) {
      const duplicate = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", updates.name!))
        .first()
      if (duplicate) {
        throw new Error(`Tag with name "${updates.name}" already exists`)
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
    return id
  },
})

/**
 * Delete a tag and its transaction associations
 */
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, { id }) => {
    // Delete transaction-tag associations first
    const associations = await ctx.db
      .query("transactionTags")
      .withIndex("by_tagId", (q) => q.eq("tagId", id))
      .collect()

    for (const assoc of associations) {
      await ctx.db.delete(assoc._id)
    }

    // Delete tag
    await ctx.db.delete(id)
    return id
  },
})
