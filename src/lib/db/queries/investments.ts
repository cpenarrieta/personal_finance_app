/**
 * Investment-related queries with Next.js 16+ caching
 * Uses Convex for data fetching
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"
import type { Id } from "../../../../convex/_generated/dataModel"

/**
 * Get all holdings with relations
 * Cached with 24h expiration, tagged with "holdings"
 */
export async function getAllHoldings() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("holdings")

  return fetchQuery(api.investments.getAllHoldings)
}

/**
 * Get all investment transactions with relations
 * Cached with 24h expiration, tagged with "investments"
 */
export async function getAllInvestmentTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("investments")

  return fetchQuery(api.investments.getAllInvestmentTransactions)
}

/**
 * Get holdings for a specific account
 * Cached with 24h expiration, tagged with "holdings"
 */
export async function getHoldingsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("holdings")

  return fetchQuery(api.investments.getHoldingsForAccount, {
    accountId: accountId as Id<"accounts">,
  })
}

/**
 * Get investment transactions for a specific account
 * Cached with 24h expiration, tagged with "investments"
 */
export async function getInvestmentTransactionsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("investments")

  return fetchQuery(api.investments.getInvestmentTransactionsForAccount, {
    accountId: accountId as Id<"accounts">,
  })
}
