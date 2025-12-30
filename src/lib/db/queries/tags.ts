/**
 * Tag-related queries with Next.js 16+ caching
 */

import { prisma } from "@/lib/db/prisma"
import { cacheTag, cacheLife } from "next/cache"
import type { TagForClient } from "@/types"

/**
 * Get all tags
 * Cached with 24h expiration, tagged with "tags"
 */
export async function getAllTags() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("tags")

  return prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
    },
    orderBy: { name: "asc" },
  }) as Promise<TagForClient[]>
}

/**
 * Get all tags with transaction counts
 * Cached with 24h expiration, tagged with "tags"
 */
export async function getAllTagsWithCounts() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("tags")

  return prisma.tag.findMany({
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: "asc" },
  })
}
