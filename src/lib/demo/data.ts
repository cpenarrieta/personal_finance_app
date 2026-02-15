import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"

let demoClient: ConvexHttpClient | null = null

function getDemoClient() {
  if (!demoClient) {
    const url = process.env.NEXT_PUBLIC_DEMO_CONVEX_URL
    if (!url) throw new Error("NEXT_PUBLIC_DEMO_CONVEX_URL is not set")
    demoClient = new ConvexHttpClient(url)
  }
  return demoClient
}

export async function demoFetchQuery<T>(queryFn: any, args: Record<string, any> = {}): Promise<T> {
  return getDemoClient().query(queryFn, args) as Promise<T>
}

/**
 * Demo version of getDashboardMetrics
 */
export async function getDemoDashboardMetrics() {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-dashboard")

  return demoFetchQuery(api.dashboard.getMetrics, {})
}

/**
 * Demo version of getStatsWithTrends
 */
export async function getDemoStatsWithTrends(monthsBack: number = 0) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-dashboard")

  return demoFetchQuery(api.dashboard.getStatsWithTrends, { monthsBack })
}

/**
 * Demo version of getLastMonthStats
 */
export async function getDemoLastMonthStats(monthsBack: number = 0) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-dashboard")

  return demoFetchQuery(api.dashboard.getLastMonthStats, { monthsBack })
}

/**
 * Demo version of getTopExpensiveTransactions
 */
export async function getDemoTopExpensiveTransactions(monthsBack: number = 0, limit = 25) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  cacheTag("demo-dashboard")

  return demoFetchQuery(api.dashboard.getTopExpensiveTransactions, { monthsBack, limit })
}

/**
 * Demo version of hasConnectedAccounts (always true for demo)
 */
export async function demoHasConnectedAccounts() {
  return true
}
