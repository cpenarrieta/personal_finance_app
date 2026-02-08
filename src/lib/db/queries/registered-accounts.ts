/**
 * Registered accounts (RRSP/TFSA) queries with Next.js 16+ caching
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"
import type { Id } from "../../../../convex/_generated/dataModel"

export async function getRegisteredAccountsSummary() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("registered-accounts")

  return fetchQuery(api.registeredAccounts.getSummary)
}

export async function getRegisteredAccountWithRoom(accountId: string) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("registered-accounts")

  return fetchQuery(api.registeredAccounts.getAccountWithRoom, {
    accountId: accountId as Id<"registeredAccounts">,
  })
}

export async function getAllRegisteredAccounts() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("registered-accounts")

  return fetchQuery(api.registeredAccounts.getAll)
}
