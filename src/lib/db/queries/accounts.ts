/**
 * Account-related queries with Next.js 16+ caching
 */

import { prisma } from "@/lib/db/prisma"
import { cacheTag, cacheLife } from "next/cache"
import type { PlaidAccountForClient } from "@/types"

/**
 * Get all accounts
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAllAccounts() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return prisma.plaidAccount.findMany({
    select: {
      id: true,
      plaidAccountId: true,
      itemId: true,
      name: true,
      officialName: true,
      mask: true,
      type: true,
      subtype: true,
      currency: true,
      current_balance_number: true, // Generated column
      available_balance_number: true, // Generated column
      credit_limit_number: true, // Generated column
      balance_updated_at_string: true, // Generated column
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
    },
    orderBy: { name: "asc" },
  }) as Promise<PlaidAccountForClient[]>
}

/**
 * Get all accounts with full institution details
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAllAccountsWithInstitution() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return prisma.plaidAccount.findMany({
    select: {
      id: true,
      plaidAccountId: true,
      itemId: true,
      name: true,
      officialName: true,
      mask: true,
      type: true,
      subtype: true,
      currency: true,
      current_balance_number: true,
      available_balance_number: true,
      credit_limit_number: true,
      balance_updated_at_string: true,
      created_at_string: true,
      updated_at_string: true,
      item: {
        select: {
          id: true,
          plaidItemId: true,
          accessToken: true,
          lastTransactionsCursor: true,
          lastInvestmentsCursor: true,
          status: true,
          created_at_string: true,
          updated_at_string: true,
          institution: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              shortName: true,
              created_at_string: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })
}

/**
 * Get account by ID with full relations
 * Cached with 24h expiration, tagged with "accounts"
 */
export async function getAccountById(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  return prisma.plaidAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      plaidAccountId: true,
      itemId: true,
      name: true,
      officialName: true,
      mask: true,
      type: true,
      subtype: true,
      currency: true,
      current_balance_number: true,
      available_balance_number: true,
      credit_limit_number: true,
      balance_updated_at_string: true,
      created_at_string: true,
      updated_at_string: true,
      item: {
        select: {
          id: true,
          plaidItemId: true,
          accessToken: true,
          lastTransactionsCursor: true,
          lastInvestmentsCursor: true,
          status: true,
          created_at_string: true,
          updated_at_string: true,
          institution: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              shortName: true,
              created_at_string: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Get all connected Plaid items with institution info
 * Cached with 24h expiration, tagged with "items"
 */
export async function getAllConnectedItems() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("items")

  return prisma.item.findMany({
    select: {
      id: true,
      plaidItemId: true,
      accessToken: true,
      status: true,
      created_at_string: true,
      updated_at_string: true,
      institution: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          shortName: true,
        },
      },
      accounts: {
        select: {
          id: true,
          name: true,
          type: true,
          subtype: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}
