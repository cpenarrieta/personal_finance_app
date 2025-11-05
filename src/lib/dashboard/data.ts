import { prisma } from "@/lib/prisma";
import {
  startOfMonth as dateStartOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

/**
 * Get dashboard metrics (accounts and holdings)
 * Fetches accounts with balances and all holdings in parallel
 */
export async function getDashboardMetrics() {
  const [accounts, holdings] = await Promise.all([
    prisma.plaidAccount.findMany({
      include: { item: { include: { institution: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.holding.findMany({
      include: { security: true },
    }),
  ]);

  return { accounts, holdings };
}

/**
 * Get uncategorized transactions count and data
 */
export async function getUncategorizedTransactions() {
  const uncategorizedCount = await prisma.transaction.count({
    where: {
      categoryId: null,
      isSplit: false,
    },
  });

  const uncategorizedTransactions =
    uncategorizedCount > 0
      ? await prisma.transaction.findMany({
          where: {
            categoryId: null,
            isSplit: false,
          },
          orderBy: { date: "desc" },
          include: {
            account: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        })
      : [];

  return { uncategorizedCount, uncategorizedTransactions };
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit = 20) {
  return prisma.transaction.findMany({
    where: {
      isSplit: false,
    },
    take: limit,
    orderBy: { date: "desc" },
    include: {
      account: true,
      category: true,
      subcategory: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

/**
 * Get last month date range
 */
export function getLastMonthDateRange() {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = dateStartOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);

  return { lastMonthStart, lastMonthEnd };
}

/**
 * Get last month statistics (spending, income, and transactions)
 * Uses a single optimized raw SQL query for spending and income
 */
export async function getLastMonthStats() {
  const { lastMonthStart, lastMonthEnd } = getLastMonthDateRange();

  // Optimized: Single raw SQL query to get both spending and income
  const [stats] = await prisma.$queryRaw<
    Array<{
      total_spending: number | null;
      total_income: number | null;
    }>
  >`
    SELECT
      SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_spending,
      SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_income
    FROM "Transaction" t
    LEFT JOIN "Category" c ON t."categoryId" = c.id
    WHERE t.date >= ${lastMonthStart}
      AND t.date < ${lastMonthEnd}
      AND t."isSplit" = false
      AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
  `;

  const totalLastMonthSpending = stats?.total_spending || 0;
  const totalLastMonthIncome = stats?.total_income || 0;

  // Fetch all transactions for the month (needed for charts)
  const lastMonthTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: lastMonthStart,
        lt: lastMonthEnd,
      },
      isSplit: false,
    },
    include: {
      category: true,
      subcategory: true,
    },
  });

  return {
    totalLastMonthSpending,
    totalLastMonthIncome,
    lastMonthTransactions,
    lastMonthStart,
    lastMonthEnd,
  };
}

/**
 * Get top expensive transactions from last month
 */
export async function getTopExpensiveTransactions(limit = 25) {
  const { lastMonthStart, lastMonthEnd } = getLastMonthDateRange();

  return prisma.transaction.findMany({
    where: {
      date: {
        gte: lastMonthStart,
        lt: lastMonthEnd,
      },
      amount: {
        gt: 0,
      },
      isSplit: false,
      category: {
        isTransferCategory: false,
      },
    },
    take: limit,
    orderBy: {
      amount: "desc",
    },
    include: {
      account: true,
      category: true,
      subcategory: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

/**
 * Check if user has any connected Plaid items
 */
export async function hasConnectedAccounts() {
  const itemsCount = await prisma.item.count();
  return itemsCount > 0;
}
