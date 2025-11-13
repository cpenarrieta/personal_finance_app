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
 * Get date range for the last N full months
 * @param monthsBack Number of full months to go back (0 = current month, 1, 2, 3, or 6)
 * @returns Start and end dates for the period
 */
export function getLastMonthDateRange(monthsBack: number = 0) {
  const now = new Date()

  if (monthsBack === 0) {
    // Current month: from start of current month to today
    const periodStart = dateStartOfMonth(now)
    const periodEnd = now
    return { lastMonthStart: periodStart, lastMonthEnd: periodEnd }
  }

  // Last N full months: from beginning of N months ago to end of last month
  const periodStart = dateStartOfMonth(subMonths(now, monthsBack))
  const periodEnd = endOfMonth(subMonths(now, 1))

  return { lastMonthStart: periodStart, lastMonthEnd: periodEnd }
}

/**
 * Get statistics for the last N full months (spending, income, and transactions)
 * Uses a single optimized raw SQL query for spending and income
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 */
export async function getLastMonthStats(monthsBack: number = 0) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions", "dashboard")

  const { lastMonthStart, lastMonthEnd } = getLastMonthDateRange(monthsBack)

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
 * Get top expensive transactions from the last N full months
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 * @param limit Maximum number of transactions to return
 */
export async function getTopExpensiveTransactions(monthsBack: number = 0, limit = 25) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions", "dashboard")

  const { lastMonthStart, lastMonthEnd } = getLastMonthDateRange(monthsBack)

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

/**
 * Get stats with trends comparing current period to previous period
 * @param monthsBack Number of full months to include (0 = current month, 1, 2, 3, or 6)
 */
export async function getStatsWithTrends(monthsBack: number = 0) {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions", "dashboard")

  const now = new Date()

  let currentPeriodStart: Date
  let currentPeriodEnd: Date
  let previousPeriodStart: Date
  let previousPeriodEnd: Date

  if (monthsBack === 0) {
    // Current month: from start of current month to today
    currentPeriodStart = dateStartOfMonth(now)
    currentPeriodEnd = now

    // Previous period: last full month
    previousPeriodStart = dateStartOfMonth(subMonths(now, 1))
    previousPeriodEnd = endOfMonth(subMonths(now, 1))
  } else {
    // Last N full months
    currentPeriodStart = dateStartOfMonth(subMonths(now, monthsBack))
    currentPeriodEnd = endOfMonth(subMonths(now, 1))

    // Previous period (same length)
    previousPeriodStart = dateStartOfMonth(subMonths(now, monthsBack * 2))
    previousPeriodEnd = endOfMonth(subMonths(now, monthsBack + 1))
  }

  // Get stats for both periods
  const [currentStats, previousStats] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        total_spending: number | null
        total_income: number | null
        transaction_count: bigint
      }>
    >`
      SELECT
        CAST(SUM(CASE WHEN t.amount_number < 0 THEN ABS(t.amount_number) ELSE 0 END) AS double precision) as total_spending,
        CAST(SUM(CASE WHEN t.amount_number > 0 THEN t.amount_number ELSE 0 END) AS double precision) as total_income,
        COUNT(*) as transaction_count
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      WHERE t.date >= ${currentPeriodStart}
        AND t.date < ${currentPeriodEnd}
        AND t."isSplit" = false
        AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
    `,
    prisma.$queryRaw<
      Array<{
        total_spending: number | null
        total_income: number | null
        transaction_count: bigint
      }>
    >`
      SELECT
        CAST(SUM(CASE WHEN t.amount_number < 0 THEN ABS(t.amount_number) ELSE 0 END) AS double precision) as total_spending,
        CAST(SUM(CASE WHEN t.amount_number > 0 THEN t.amount_number ELSE 0 END) AS double precision) as total_income,
        COUNT(*) as transaction_count
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      WHERE t.date >= ${previousPeriodStart}
        AND t.date < ${previousPeriodEnd}
        AND t."isSplit" = false
        AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
    `,
  ])

  const current = currentStats[0]
  const previous = previousStats[0]

  return {
    current: {
      spending: Number(current?.total_spending || 0),
      income: Number(current?.total_income || 0),
      transactionCount: Number(current?.transaction_count || 0),
    },
    previous: {
      spending: Number(previous?.total_spending || 0),
      income: Number(previous?.total_income || 0),
      transactionCount: Number(previous?.transaction_count || 0),
    },
  }
}
