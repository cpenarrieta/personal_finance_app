/**
 * Demo database queries
 * Mirrors src/lib/db/queries but uses the demo Convex deployment
 * IMPORTANT: Never uses NEXT_PUBLIC_CONVEX_URL — always uses NEXT_PUBLIC_DEMO_CONVEX_URL
 */

import { api } from "../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"
import type { Id } from "../../../convex/_generated/dataModel"
import { demoFetchQuery } from "./data"

// Transaction queries

export async function getAllTransactions() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-transactions")

  return demoFetchQuery(api.transactions.getAll)
}

export async function getTransactionsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-transactions")

  return demoFetchQuery(api.transactions.getForAccount, { accountId: accountId as Id<"accounts"> })
}

export async function getTransactionById(id: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-transactions")

  return demoFetchQuery(api.transactions.getById, { id: id as Id<"transactions"> })
}

// Account queries

export async function getAllAccounts() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-accounts")

  return demoFetchQuery(api.accounts.getAll)
}

export async function getAllAccountsWithInstitution() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-accounts")

  return demoFetchQuery(api.accounts.getAllWithInstitution)
}

export async function getAccountById(accountId: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-accounts")

  return demoFetchQuery(api.accounts.getById, { id: accountId as Id<"accounts"> })
}

export async function getAllConnectedItems() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-items")

  return demoFetchQuery(api.accounts.getAllConnectedItems)
}

// Category queries

export async function getAllCategories() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-categories")

  return demoFetchQuery(api.categories.getAll)
}

export async function getAllCategoriesForManagement() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-categories")

  return demoFetchQuery(api.categories.getAllForManagement)
}

// Tag queries

export async function getAllTags() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-tags")

  return demoFetchQuery(api.tags.getAll)
}

export async function getAllTagsWithCounts() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-tags")

  return demoFetchQuery(api.tags.getAllWithCounts)
}

// Investment queries

export async function getAllHoldings() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-holdings")

  return demoFetchQuery(api.investments.getAllHoldings)
}

export async function getAllInvestmentTransactions() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-investments")

  return demoFetchQuery(api.investments.getAllInvestmentTransactions)
}

export async function getHoldingsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-holdings")

  return demoFetchQuery(api.investments.getHoldingsForAccount, {
    accountId: accountId as Id<"accounts">,
  })
}

export async function getInvestmentTransactionsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-investments")

  return demoFetchQuery(api.investments.getInvestmentTransactionsForAccount, {
    accountId: accountId as Id<"accounts">,
  })
}

export async function getHoldingsByTicker(ticker: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-holdings")

  return demoFetchQuery(api.investments.getHoldingsByTickerSymbol, {
    tickerSymbol: ticker,
  })
}

export async function getTransactionsByTicker(ticker: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-investments")

  return demoFetchQuery(api.investments.getInvestmentTransactionsByTickerSymbol, {
    tickerSymbol: ticker,
  })
}
