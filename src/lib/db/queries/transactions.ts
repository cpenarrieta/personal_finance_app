/**
 * Transaction-related queries with Next.js 16+ caching
 */

import { prisma } from "@/lib/db/prisma"
import { cacheTag, cacheLife } from "next/cache"
import { TRANSACTION_SELECT, TRANSACTION_SELECT_MINIMAL } from "./selects"

/**
 * Get all transactions with full relations
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getAllTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  return prisma.transaction.findMany({
    where: {
      isSplit: false, // Filter out parent transactions that have been split
    },
    orderBy: { datetime: "desc" },
    select: TRANSACTION_SELECT,
  })
}

/**
 * Get transactions for a specific account
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getTransactionsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  return prisma.transaction.findMany({
    where: {
      accountId,
      isSplit: false,
    },
    orderBy: { datetime: "desc" },
    select: TRANSACTION_SELECT,
  })
}

/**
 * Get transactions that need review (uncategorized, "for-review" tag, or "sign-review" tag)
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getReviewTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  // Get review tag IDs
  const [forReviewTag, signReviewTag] = await Promise.all([
    prisma.tag.findUnique({ where: { name: "for-review" }, select: { id: true } }),
    prisma.tag.findUnique({ where: { name: "sign-review" }, select: { id: true } }),
  ])

  // Build tag conditions
  const tagConditions = [forReviewTag, signReviewTag]
    .filter((tag): tag is { id: string } => tag !== null)
    .map((tag) => ({ tags: { some: { tagId: tag.id } } }))

  return prisma.transaction.findMany({
    where: {
      AND: [
        { isSplit: false }, // Filter out parent transactions that have been split
        {
          OR: [
            { categoryId: null }, // Uncategorized transactions
            ...tagConditions, // Transactions with for-review or sign-review tags
          ],
        },
      ],
    },
    orderBy: { datetime: "desc" },
    select: TRANSACTION_SELECT_MINIMAL,
  })
}

/**
 * Get transaction by ID with full relations
 * Cached with 24h expiration, tagged with "transactions"
 */
export async function getTransactionById(id: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  return prisma.transaction.findUnique({
    where: { id },
    select: {
      ...TRANSACTION_SELECT,
      files: true,
      parentTransaction: {
        select: {
          id: true,
          name: true,
          amount_number: true,
          datetime: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      childTransactions: {
        select: {
          id: true,
          name: true,
          amount_number: true,
          datetime: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          subcategory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })
}
