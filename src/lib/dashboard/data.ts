import { prisma } from "@/lib/db/prisma"
import { startOfMonth as dateStartOfMonth, endOfMonth, subMonths } from "date-fns"
import { cacheTag, cacheLife } from "next/cache"

/**
 * Get dashboard metrics (accounts and holdings)
 * Fetches accounts with balances and all holdings in parallel
 */
export async function getDashboardMetrics() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts", "holdings", "dashboard")

  const [accounts, holdings] = await Promise.all([
    prisma.plaidAccount.findMany({
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
    }),
    prisma.holding.findMany({
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
      },
    }),
  ])

  return { accounts, holdings }
}

/**
 * Get uncategorized transactions count and data
 */
export async function getUncategorizedTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions", "dashboard")

  const uncategorizedCount = await prisma.transaction.count({
    where: {
      categoryId: null,
      isSplit: false,
    },
  })

  const uncategorizedTransactions =
    uncategorizedCount > 0
      ? await prisma.transaction.findMany({
          where: {
            categoryId: null,
            isSplit: false,
          },
          orderBy: { date: "desc" },
          select: {
            id: true,
            plaidTransactionId: true,
            accountId: true,
            amount_number: true,
            isoCurrencyCode: true,
            date_string: true,
            authorized_date_string: true,
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
                plaidAccountId: true,
                name: true,
                type: true,
                subtype: true,
                mask: true,
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
          },
        })
      : []

  return { uncategorizedCount, uncategorizedTransactions }
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit = 20) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions", "dashboard")

  return prisma.transaction.findMany({
    where: {
      isSplit: false,
    },
    take: limit,
    orderBy: { date: "desc" },
    select: {
      id: true,
      plaidTransactionId: true,
      accountId: true,
      amount_number: true,
      isoCurrencyCode: true,
      date_string: true,
      authorized_date_string: true,
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
          plaidAccountId: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isTransferCategory: true,
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
    },
  })
}

/**
 * Get last month date range
 */
export function getLastMonthDateRange() {
  const now = new Date()
  const lastMonth = subMonths(now, 1)
  const lastMonthStart = dateStartOfMonth(lastMonth)
  const lastMonthEnd = endOfMonth(lastMonth)

  return { lastMonthStart, lastMonthEnd }
}

/**
 * Get last month statistics (spending, income, and transactions)
 * Uses a single optimized raw SQL query for spending and income
 */
export async function getLastMonthStats() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions", "dashboard")

  const { lastMonthStart, lastMonthEnd } = getLastMonthDateRange()

  // Optimized: Single raw SQL query to get both spending and income
  // Uses amount_number (already inverted): negative = expense, positive = income
  const [stats] = await prisma.$queryRaw<
    Array<{
      total_spending: number | null
      total_income: number | null
    }>
  >`
    SELECT
      CAST(SUM(CASE WHEN t.amount_number < 0 THEN ABS(t.amount_number) ELSE 0 END) AS double precision) as total_spending,
      CAST(SUM(CASE WHEN t.amount_number > 0 THEN t.amount_number ELSE 0 END) AS double precision) as total_income
    FROM "Transaction" t
    LEFT JOIN "Category" c ON t."categoryId" = c.id
    WHERE t.date >= ${lastMonthStart}
      AND t.date < ${lastMonthEnd}
      AND t."isSplit" = false
      AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
  `

  const totalLastMonthSpending = Number(stats?.total_spending || 0)
  const totalLastMonthIncome = Number(stats?.total_income || 0)

  // Fetch all transactions for the month (needed for charts)
  const lastMonthTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: lastMonthStart,
        lt: lastMonthEnd,
      },
      isSplit: false,
    },
    select: {
      id: true,
      plaidTransactionId: true,
      accountId: true,
      amount_number: true,
      isoCurrencyCode: true,
      date_string: true,
      authorized_date_string: true,
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
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isTransferCategory: true,
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
    },
  })

  return {
    totalLastMonthSpending,
    totalLastMonthIncome,
    lastMonthTransactions,
    lastMonthStart,
    lastMonthEnd,
  }
}

/**
 * Get top expensive transactions from last month
 */
export async function getTopExpensiveTransactions(limit = 25) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions", "dashboard")

  const { lastMonthStart, lastMonthEnd } = getLastMonthDateRange()

  return prisma.transaction.findMany({
    where: {
      date: {
        gte: lastMonthStart,
        lt: lastMonthEnd,
      },
      amount_number: {
        lt: 0,
      },
      isSplit: false,
      category: {
        isTransferCategory: false,
      },
    },
    take: limit,
    orderBy: {
      amount_number: "asc",
    },
    select: {
      id: true,
      plaidTransactionId: true,
      accountId: true,
      amount_number: true,
      isoCurrencyCode: true,
      date_string: true,
      authorized_date_string: true,
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
          plaidAccountId: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isTransferCategory: true,
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
    },
  })
}

/**
 * Check if user has any connected Plaid items
 */
export async function hasConnectedAccounts() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("accounts")

  const itemsCount = await prisma.item.count()
  return itemsCount > 0
}
