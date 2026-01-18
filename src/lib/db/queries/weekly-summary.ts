/**
 * Weekly summary queries with Next.js 16+ caching
 * Uses Convex for data fetching
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"

/**
 * Get the most recent weekly summary
 */
export async function getLatestWeeklySummary() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("weekly-summary", "dashboard")

  return fetchQuery(api.weeklySummary.getLatest)
}
