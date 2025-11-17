/**
 * Cached query for single transaction detail
 * Separate file to avoid circular dependencies
 */

import { prisma } from "@/lib/db/prisma"
import { cacheTag, cacheLife } from "next/cache"

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
      id: true,
      plaidTransactionId: true,
      accountId: true,
      amount_number: true,
      isoCurrencyCode: true,
      datetime: true,
      authorizedDatetime: true,
      pending: true,
      merchantName: true,
      name: true,
      plaidCategory: true,
      plaidSubcategory: true,
      paymentChannel: true,
      pendingTransactionId: true,
      logoUrl: true,
      categoryIconUrl: true,
      categoryId: true,
      subcategoryId: true,
      notes: true,
      isSplit: true,
      parentTransactionId: true,
      originalTransactionId: true,
      created_at_string: true,
      updated_at_string: true,
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
              created_at_string: true,
              updated_at_string: true,
            },
          },
        },
      },
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
