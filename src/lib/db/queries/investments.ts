/**
 * Investment-related queries with Next.js 16+ caching
 */

import { prisma } from "@/lib/db/prisma"
import { cacheTag, cacheLife } from "next/cache"

/**
 * Get all holdings with relations
 * Cached with 24h expiration, tagged with "holdings"
 */
export async function getAllHoldings() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("holdings")

  return prisma.holding.findMany({
    select: {
      id: true,
      accountId: true,
      securityId: true,
      quantity_number: true,
      cost_basis_number: true,
      institution_price_number: true,
      institution_price_as_of_string: true,
      isoCurrencyCode: true,
      created_at_string: true,
      updated_at_string: true,
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      account: {
        select: {
          id: true,
          plaidAccountId: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
        },
      },
    },
  })
}

/**
 * Get all investment transactions with relations
 * Cached with 24h expiration, tagged with "investments"
 */
export async function getAllInvestmentTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("investments")

  return prisma.investmentTransaction.findMany({
    select: {
      id: true,
      plaidInvestmentTransactionId: true,
      accountId: true,
      securityId: true,
      type: true,
      amount_number: true,
      price_number: true,
      quantity_number: true,
      fees_number: true,
      isoCurrencyCode: true,
      transactionDatetime: true,
      name: true,
      created_at_string: true,
      updated_at_string: true,
      account: {
        select: {
          id: true,
          plaidAccountId: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
        },
      },
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
    },
    orderBy: { transactionDatetime: "desc" },
  })
}

/**
 * Get holdings for a specific account
 * Cached with 24h expiration, tagged with "holdings"
 */
export async function getHoldingsForAccount(accountId: string) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("holdings")

  return prisma.holding.findMany({
    where: { accountId },
    select: {
      id: true,
      accountId: true,
      securityId: true,
      quantity_number: true,
      cost_basis_number: true,
      institution_price_number: true,
      institution_price_as_of_string: true,
      isoCurrencyCode: true,
      created_at_string: true,
      updated_at_string: true,
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
        },
      },
    },
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

  return prisma.investmentTransaction.findMany({
    where: { accountId },
    select: {
      id: true,
      plaidInvestmentTransactionId: true,
      accountId: true,
      securityId: true,
      type: true,
      amount_number: true,
      price_number: true,
      quantity_number: true,
      fees_number: true,
      isoCurrencyCode: true,
      transactionDatetime: true,
      name: true,
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
      security: {
        select: {
          id: true,
          plaidSecurityId: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
          created_at_string: true,
          updated_at_string: true,
        },
      },
    },
    orderBy: { transactionDatetime: "desc" },
  })
}
