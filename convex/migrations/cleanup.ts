// convex/migrations/cleanup.ts
// Cleanup functions for post-migration

import { mutation } from "../_generated/server"

// Delete all ID mappings (run after migration is verified)
export const deleteIdMappings = mutation({
  args: {},
  handler: async (ctx) => {
    const allMappings = await ctx.db.query("idMappings").collect()

    let deleted = 0
    for (const mapping of allMappings) {
      await ctx.db.delete(mapping._id)
      deleted++
    }

    return { deleted }
  },
})

// Delete all data from a specific table (use with caution!)
export const clearTable = mutation({
  args: {},
  handler: async (ctx) => {
    // This is a safety measure - only clear idMappings
    const allMappings = await ctx.db.query("idMappings").collect()

    let deleted = 0
    for (const mapping of allMappings) {
      await ctx.db.delete(mapping._id)
      deleted++
    }

    return { deleted }
  },
})
