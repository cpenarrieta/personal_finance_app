/**
 * Category-related queries with Next.js 16+ caching
 * Uses Convex for data fetching
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"

/**
 * Get all categories with subcategories
 * Cached with 24h expiration, tagged with "categories"
 */
export async function getAllCategories() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("categories")

  return fetchQuery(api.categories.getAll)
}

/**
 * Get all categories with subcategories for management
 * Cached with 24h expiration, tagged with "categories"
 */
export async function getAllCategoriesForManagement() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("categories")

  return fetchQuery(api.categories.getAllForManagement)
}

/**
 * Get all categories for move-transactions page
 * Cached with 24h expiration, tagged with "categories"
 */
export async function getAllCategoriesForMoveTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("categories")

  // Uses same query as getAllCategories
  return fetchQuery(api.categories.getAll)
}
