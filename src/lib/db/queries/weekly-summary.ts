/**
 * Weekly summary queries with Next.js 16+ caching
 */

import { prisma } from "@/lib/db/prisma"
import { cacheTag, cacheLife } from "next/cache"

/**
 * Get the most recent weekly summary
 */
export async function getLatestWeeklySummary() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("weekly-summary", "dashboard")

  return prisma.weeklySummary.findFirst({
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      generated_at_string: true,
      summary: true,
    },
  })
}
