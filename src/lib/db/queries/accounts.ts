/**
 * Account-related queries with Next.js 16+ caching
 * Uses Convex for data fetching
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"
import type { Id } from "../../../../convex/_generated/dataModel"

/**
 * Get all accounts
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAllAccounts() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return fetchQuery(api.accounts.getAll)
}

/**
 * Get all accounts with full institution details
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAllAccountsWithInstitution() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return fetchQuery(api.accounts.getAllWithInstitution)
}

/**
 * Get account by ID with full relations
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAccountById(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return fetchQuery(api.accounts.getById, { id: accountId as Id<"accounts"> })
}

/**
 * Get all connected Plaid items with institution info
 * Cached with 24h expiration, tagged with "items"
 */
export async function getAllConnectedItems() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("items")

  return fetchQuery(api.accounts.getAllConnectedItems)
}
