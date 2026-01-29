/**
 * Transaction-related queries with Next.js 16+ caching
 * Uses Convex for data fetching
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"
import type { Id } from "../../../../convex/_generated/dataModel"

/**
 * Get all transactions with full relations
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getAllTransactions() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions")

  return fetchQuery(api.transactions.getAll)
}

/**
 * Get transactions for a specific account
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getTransactionsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions")

  return fetchQuery(api.transactions.getForAccount, { accountId: accountId as Id<"accounts"> })
}

/**
 * Get transactions that need review (uncategorized, "for-review" tag, or "sign-review" tag)
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getReviewTransactions() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions")

  return fetchQuery(api.transactions.getReviewTransactions)
}

/**
 * Get transaction by ID with full relations
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getTransactionById(id: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("transactions")

  return fetchQuery(api.transactions.getById, { id: id as Id<"transactions"> })
}
