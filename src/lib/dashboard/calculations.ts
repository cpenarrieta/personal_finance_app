import { PlaidAccount, Holding, Transaction, Category, Subcategory } from "@prisma/client";
import { format, eachDayOfInterval } from "date-fns";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Calculate total balance across all accounts
 */
export function calculateTotalBalance(accounts: PlaidAccount[]): number {
  return accounts.reduce((sum: number, acc: PlaidAccount) => {
    return sum + (acc.currentBalance?.toNumber() || 0);
  }, 0);
}

/**
 * Calculate total investment value from holdings
 */
export function calculateInvestmentValue(holdings: Holding[]): number {
  return holdings.reduce((sum: number, holding: Holding) => {
    const quantity = holding.quantity.toNumber();
    const price = holding.institutionPrice?.toNumber() || 0;
    return sum + quantity * price;
  }, 0);
}

type TransactionWithCategory = Transaction & {
  category: Category | null;
  subcategory: Subcategory | null;
};

/**
 * Prepare spending by category data for charts
 */
export function prepareSpendingByCategory(
  transactions: TransactionWithCategory[],
  topN = 10
) {
  const categorySpending = transactions
    .filter((t) => {
      return (
        t.amount.toNumber() > 0 && t.category && !t.category.isTransferCategory
      );
    })
    .reduce((acc: Record<string, number>, t) => {
      const categoryName = t.category?.name || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += Math.abs(t.amount.toNumber());
      return acc;
    }, {} as Record<string, number>);

  return Object.entries(categorySpending)
    .map(([name, value], index) => ({
      name,
      value: value as number,
      color: CHART_COLORS[index % CHART_COLORS.length] as string,
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, topN);
}

/**
 * Prepare spending by subcategory data for charts
 */
export function prepareSpendingBySubcategory(
  transactions: TransactionWithCategory[],
  topN = 10
) {
  const subcategorySpending = transactions
    .filter((t) => {
      return (
        t.amount.toNumber() > 0 &&
        t.subcategory &&
        t.category &&
        !t.category.isTransferCategory
      );
    })
    .reduce((acc: Record<string, number>, t) => {
      const subcategoryName = t.subcategory?.name || "Other";
      if (!acc[subcategoryName]) {
        acc[subcategoryName] = 0;
      }
      acc[subcategoryName] += Math.abs(t.amount.toNumber());
      return acc;
    }, {} as Record<string, number>);

  return Object.entries(subcategorySpending)
    .map(([name, value], index) => ({
      name,
      value: value as number,
      color: CHART_COLORS[index % CHART_COLORS.length] as string,
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, topN);
}

/**
 * Prepare daily spending data for charts
 */
export function prepareDailySpendingData(
  transactions: TransactionWithCategory[],
  startDate: Date,
  endDate: Date
) {
  const daysInRange = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  return daysInRange.map((day) => {
    const dayTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getDate() === day.getDate() &&
        transactionDate.getMonth() === day.getMonth() &&
        transactionDate.getFullYear() === day.getFullYear()
      );
    });

    const spending = dayTransactions
      .filter(
        (t) =>
          t.amount.toNumber() > 0 &&
          t.category &&
          !t.category.isTransferCategory
      )
      .reduce((sum: number, t) => sum + Math.abs(t.amount.toNumber()), 0);

    return {
      day: format(day, "MMM d"),
      spending,
    };
  });
}
