import Link from "next/link";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  format,
  startOfMonth as dateStartOfMonth,
  subMonths,
  eachMonthOfInterval,
} from "date-fns";
import type { Metadata } from "next";
import { Holding, PlaidAccount } from "@prisma/client";
import { MetricCard } from "@/components/MetricCard";
import { Wallet, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart";

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page() {
  // Check if user has connected Plaid accounts
  const itemsCount = await prisma.item.count();

  if (itemsCount === 0) {
    redirect("/connect-account");
  }

  // Fetch accounts with balance information
  const accounts = await prisma.plaidAccount.findMany({
    include: { item: { include: { institution: true } } },
    orderBy: { name: "asc" },
  });

  // Fetch holdings for investment value
  const holdings = await prisma.holding.findMany({
    include: { security: true },
  });

  // Calculate total balances
  const totalCurrent = accounts.reduce((sum: number, acc: PlaidAccount) => {
    return sum + (acc.currentBalance?.toNumber() || 0);
  }, 0);

  // Calculate total investment value from holdings
  const totalInvestmentValue = holdings.reduce(
    (sum: number, holding: Holding) => {
      const quantity = holding.quantity.toNumber();
      const price = holding.institutionPrice?.toNumber() || 0;
      return sum + quantity * price;
    },
    0
  );

  // Fetch recent 20 transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      isSplit: false, // Filter out parent transactions that have been split
    },
    take: 20,
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

  // Count uncategorized transactions
  const uncategorizedCount = await prisma.transaction.count({
    where: {
      categoryId: null,
      isSplit: false, // Filter out parent transactions that have been split
    },
  });

  // Fetch uncategorized transactions if any exist
  const uncategorizedTransactions =
    uncategorizedCount > 0
      ? await prisma.transaction.findMany({
          where: {
            categoryId: null,
            isSplit: false, // Filter out parent transactions that have been split
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

  // Calculate spending for last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthlySpending = await prisma.transaction.aggregate({
    where: {
      date: {
        gte: thirtyDaysAgo,
      },
      amount: {
        gt: 0, // Positive amounts are expenses
      },
      isSplit: false, // Filter out parent transactions that have been split
    },
    _sum: {
      amount: true,
    },
  });

  const total30DaysSpending = Math.abs(
    monthlySpending._sum.amount?.toNumber() || 0
  );

  // Prepare chart data - Last 6 months
  const sixMonthsAgo = subMonths(now, 6);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  // Fetch transactions for last 6 months for charts
  const chartTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: sixMonthsAgo,
      },
      isSplit: false, // Filter out parent transactions that have been split
    },
    include: {
      category: true,
    },
  });

  // Spending by Category
  const categorySpending = chartTransactions
    .filter((t: (typeof chartTransactions)[0]) => {
      return (
        t.amount.toNumber() > 0 && t.category && !t.category.isTransferCategory
      );
    })
    .reduce((acc: Record<string, number>, t: (typeof chartTransactions)[0]) => {
      const categoryName = t.category?.name || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += Math.abs(t.amount.toNumber());
      return acc;
    }, {} as Record<string, number>);

  const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  const spendingByCategory = Object.entries(categorySpending)
    .map(([name, value], index) => ({
      name,
      value: value as number,
      color: CHART_COLORS[index % CHART_COLORS.length] as string,
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 5); // Top 5 categories

  // Monthly trend data
  const monthlyTrendData = months.map((month) => {
    const monthStart = dateStartOfMonth(month);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthTransactions = chartTransactions.filter(
      (t: (typeof chartTransactions)[0]) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      }
    );

    const spending = monthTransactions
      .filter((t: (typeof chartTransactions)[0]) => t.amount.toNumber() > 0)
      .reduce(
        (sum: number, t: (typeof chartTransactions)[0]) =>
          sum + Math.abs(t.amount.toNumber()),
        0
      );

    const income = monthTransactions
      .filter((t: (typeof chartTransactions)[0]) => t.amount.toNumber() < 0)
      .reduce(
        (sum: number, t: (typeof chartTransactions)[0]) =>
          sum + Math.abs(t.amount.toNumber()),
        0
      );

    return {
      month: format(month, "MMM yy"),
      spending,
      income,
    };
  });

  // Income vs Expense data (same as monthly trend but different structure)
  const incomeVsExpenseData = months.map((month) => {
    const monthStart = dateStartOfMonth(month);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthTransactions = chartTransactions.filter(
      (t: (typeof chartTransactions)[0]) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      }
    );

    const expenses = monthTransactions
      .filter((t: (typeof chartTransactions)[0]) => t.amount.toNumber() > 0)
      .reduce(
        (sum: number, t: (typeof chartTransactions)[0]) =>
          sum + Math.abs(t.amount.toNumber()),
        0
      );

    const income = monthTransactions
      .filter((t: (typeof chartTransactions)[0]) => t.amount.toNumber() < 0)
      .reduce(
        (sum: number, t: (typeof chartTransactions)[0]) =>
          sum + Math.abs(t.amount.toNumber()),
        0
      );

    return {
      month: format(month, "MMM yy"),
      income,
      expenses,
    };
  });

  return (
    <div className="space-y-6">
        {/* Metrics Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Balance"
            value={`$${formatAmount(totalCurrent)}`}
            subtitle={`${accounts.length} account${
              accounts.length !== 1 ? "s" : ""
            }`}
            icon={Wallet}
          />
          <MetricCard
            title="Investment Value"
            value={`$${formatAmount(totalInvestmentValue)}`}
            subtitle={`${holdings.length} holding${
              holdings.length !== 1 ? "s" : ""
            }`}
            icon={TrendingUp}
          />
          <MetricCard
            title="Last 30d Spending"
            value={`$${formatAmount(total30DaysSpending)}`}
            subtitle={format(thirtyDaysAgo, "MMMM yyyy")}
            icon={DollarSign}
          />
          <MetricCard
            title="Uncategorized"
            value={uncategorizedCount}
            subtitle="Transactions need review"
            icon={AlertCircle}
            href={
              uncategorizedCount > 0
                ? "/transactions?uncategorized=true"
                : undefined
            }
          />
        </div>

        {/* Uncategorized Transactions Section */}
        {uncategorizedCount > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  Uncategorized Transactions
                </h2>
                <p className="text-muted-foreground">
                  {uncategorizedCount} transaction
                  {uncategorizedCount !== 1 ? "s" : ""} need categorization
                </p>
              </div>
              <Button asChild>
                <Link href="/transactions?uncategorized=true">
                  Categorize All
                </Link>
              </Button>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uncategorizedTransactions
                    .slice(0, 10)
                    .map(
                      (transaction: (typeof uncategorizedTransactions)[0]) => (
                        <TableRow
                          key={transaction.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(transaction.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/transactions/${transaction.id}`}
                              className="block hover:underline"
                            >
                              <div className="font-medium">
                                {transaction.name}
                              </div>
                              {transaction.merchantName && (
                                <div className="text-sm text-muted-foreground">
                                  {transaction.merchantName}
                                </div>
                              )}
                            </Link>
                          </TableCell>
                          <TableCell>{transaction.account.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={
                                transaction.amount.toNumber() > 0
                                  ? "text-destructive"
                                  : "text-success"
                              }
                            >
                              {transaction.amount.toNumber() > 0 ? "-" : "+"}$
                              {formatAmount(
                                Math.abs(transaction.amount.toNumber())
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                </TableBody>
              </Table>
            </div>
            {uncategorizedCount > 10 && (
              <div className="text-center">
                <Button variant="outline" asChild>
                  <Link href="/transactions?uncategorized=true">
                    View All {uncategorizedCount} Uncategorized Transactions
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Recent Transactions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Recent Transactions</h2>
              <p className="text-muted-foreground">Last 20 transactions</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/transactions">View All</Link>
            </Button>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map(
                  (transaction: (typeof recentTransactions)[0]) => (
                    <TableRow
                      key={transaction.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(transaction.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/transactions/${transaction.id}`}
                          className="block hover:underline"
                        >
                          <div className="font-medium">{transaction.name}</div>
                          {transaction.merchantName && (
                            <div className="text-sm text-muted-foreground">
                              {transaction.merchantName}
                            </div>
                          )}
                          {transaction.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {transaction.tags.map(
                                (tt: (typeof transaction.tags)[0]) => (
                                  <Badge
                                    key={tt.tagId}
                                    variant="secondary"
                                    style={{ backgroundColor: tt.tag.color }}
                                    className="text-xs text-white"
                                  >
                                    {tt.tag.name}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {transaction.category ? (
                          <div>
                            <div className="font-medium">
                              {transaction.category.name}
                            </div>
                            {transaction.subcategory && (
                              <div className="text-sm text-muted-foreground">
                                {transaction.subcategory.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">Uncategorized</Badge>
                        )}
                      </TableCell>
                      <TableCell>{transaction.account.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span
                          className={
                            transaction.amount.toNumber() > 0
                              ? "text-destructive"
                              : "text-success"
                          }
                        >
                          {transaction.amount.toNumber() > 0 ? "-" : "+"}$
                          {formatAmount(
                            Math.abs(transaction.amount.toNumber())
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Financial Overview</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SpendingByCategoryChart data={spendingByCategory} />
            <MonthlyTrendChart data={monthlyTrendData} />
            <IncomeVsExpenseChart data={incomeVsExpenseData} />
          </div>
        </div>
    </div>
  );
}
