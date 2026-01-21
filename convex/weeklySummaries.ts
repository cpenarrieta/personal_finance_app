// convex/weeklySummaries.ts
// Weekly summary queries - replaces src/lib/db/queries/weekly-summary.ts

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// Helper to format timestamp to ISO string
function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString()
}

/**
 * Get the most recent weekly summary
 * Replaces: getLatestWeeklySummary()
 */
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const summary = await ctx.db.query("weeklySummaries").withIndex("by_generatedAt").order("desc").first()

    if (!summary) return null

    return {
      id: summary._id,
      generated_at_string: formatTimestamp(summary.generatedAt),
      summary: summary.summary,
    }
  },
})

/**
 * Get all weekly summaries
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const summaries = await ctx.db.query("weeklySummaries").withIndex("by_generatedAt").order("desc").collect()

    return summaries.map((s) => ({
      id: s._id,
      generated_at_string: formatTimestamp(s.generatedAt),
      summary: s.summary,
    }))
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new weekly summary
 */
export const create = mutation({
  args: {
    summary: v.string(),
  },
  handler: async (ctx, { summary }) => {
    const id = await ctx.db.insert("weeklySummaries", {
      summary,
      generatedAt: Date.now(),
    })
    return id
  },
})
