/**
 * Tag-related queries with Next.js 16+ caching
 * Uses Convex for data fetching
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"

/**
 * Get all tags
 * Cached with 24h expiration, tagged with "tags"
 */
export async function getAllTags() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("tags")

  return fetchQuery(api.tags.getAll)
}

/**
 * Get all tags with transaction counts
 * Cached with 24h expiration, tagged with "tags"
 */
export async function getAllTagsWithCounts() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("tags")

  return fetchQuery(api.tags.getAllWithCounts)
}
