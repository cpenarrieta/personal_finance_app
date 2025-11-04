import Link from "next/link";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  format,
  startOfMonth as dateStartOfMonth,
  endOfMonth,
  subMonths,
  eachDayOfInterval,
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
import { SubcategoryChart } from "@/components/charts/SubcategoryChart";
import { DailySpendingChart } from "@/components/charts/DailySpendingChart";

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

  // Calculate last full month dates
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = dateStartOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);

  // Calculate spending for last full month
  const lastMonthSpending = await prisma.transaction.aggregate({
    where: {
      date: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      amount: {
        gt: 0, // Positive amounts are expenses
      },
      isSplit: false, // Filter out parent transactions that have been split
      category: {
        isTransferCategory: false, // Exclude transfers
      },
    },
    _sum: {
      amount: true,
    },
  });

  const totalLastMonthSpending = Math.abs(
    lastMonthSpending._sum.amount?.toNumber() || 0
  );

  // Calculate income for last full month
  const lastMonthIncome = await prisma.transaction.aggregate({
    where: {
      date: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      amount: {
        lt: 0, // Negative amounts are income
      },
      isSplit: false,
      category: {
        isTransferCategory: false, // Exclude transfers
      },
    },
    _sum: {
      amount: true,
    },
  });

  const totalLastMonthIncome = Math.abs(
    lastMonthIncome._sum.amount?.toNumber() || 0
  );

  // Calculate net income (Income - Spending)
  const netIncome = totalLastMonthIncome - totalLastMonthSpending;

  // Fetch transactions for last month for charts
  const lastMonthTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      isSplit: false, // Filter out parent transactions that have been split
    },
    include: {
      category: true,
      subcategory: true,
    },
  });

  // Spending by Category (last month only)
  const categorySpending = lastMonthTransactions
    .filter((t: (typeof lastMonthTransactions)[0]) => {
      return (
        t.amount.toNumber() > 0 && t.category && !t.category.isTransferCategory
      );
    })
    .reduce((acc: Record<string, number>, t: (typeof lastMonthTransactions)[0]) => {
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

  // Spending by Subcategory (last month)
  const subcategorySpending = lastMonthTransactions
    .filter((t: (typeof lastMonthTransactions)[0]) => {
      return (
        t.amount.toNumber() > 0 && 
        t.subcategory && 
        t.category && 
        !t.category.isTransferCategory
      );
    })
    .reduce((acc: Record<string, number>, t: (typeof lastMonthTransactions)[0]) => {
      const subcategoryName = t.subcategory?.name || "Other";
      if (!acc[subcategoryName]) {
        acc[subcategoryName] = 0;
      }
      acc[subcategoryName] += Math.abs(t.amount.toNumber());
      return acc;
    }, {} as Record<string, number>);

  const spendingBySubcategory = Object.entries(subcategorySpending)
    .map(([name, value], index) => ({
      name,
      value: value as number,
      color: CHART_COLORS[index % CHART_COLORS.length] as string,
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 10); // Top 10 subcategories

  // Daily spending trend for last month
  const daysInLastMonth = eachDayOfInterval({
    start: lastMonthStart,
    end: lastMonthEnd,
  });

  const dailySpendingData = daysInLastMonth.map((day) => {
    const dayTransactions = lastMonthTransactions.filter(
      (t: (typeof lastMonthTransactions)[0]) => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate.getDate() === day.getDate() &&
          transactionDate.getMonth() === day.getMonth() &&
          transactionDate.getFullYear() === day.getFullYear()
        );
      }
    );

    const spending = dayTransactions
      .filter((t: (typeof lastMonthTransactions)[0]) => 
        t.amount.toNumber() > 0 && 
        t.category && 
        !t.category.isTransferCategory
      )
      .reduce(
        (sum: number, t: (typeof lastMonthTransactions)[0]) =>
          sum + Math.abs(t.amount.toNumber()),
        0
      );

    return {
      day: format(day, "MMM d"),
      spending,
    };
  });

  // Top 10 most expensive transactions from last month
  const topExpensiveTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      amount: {
        gt: 0, // Only expenses
      },
      isSplit: false,
      category: {
        isTransferCategory: false, // Exclude transfers
      },
    },
    take: 25,
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
            title="Last Month Spending"
            value={`$${formatAmount(totalLastMonthSpending)}`}
            subtitle={format(lastMonthStart, "MMMM yyyy")}
            icon={DollarSign}
          />
          <MetricCard
            title="Net Income"
            value={`${netIncome >= 0 ? '+' : '-'}$${formatAmount(Math.abs(netIncome))}`}
            subtitle={`${format(lastMonthStart, "MMM yyyy")} (Income - Spending)`}
            icon={AlertCircle}
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

        {/* Last Month Overview Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Last Month Overview</h2>
            <p className="text-muted-foreground">
              {format(lastMonthStart, "MMMM yyyy")} Financial Analysis
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SpendingByCategoryChart data={spendingByCategory} />
            <SubcategoryChart data={spendingBySubcategory} />
            <DailySpendingChart data={dailySpendingData} />
          </div>
        </div>

        {/* Top Expensive Transactions Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Top Expenses {format(lastMonthStart, "MMMM yyyy")}</h2>
            <p className="text-muted-foreground">
              Most expensive transactions in {format(lastMonthStart, "MMMM yyyy")}
            </p>
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
                {topExpensiveTransactions.map(
                  (transaction: (typeof topExpensiveTransactions)[0]) => (
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
                        <span className="text-destructive">
                          -${formatAmount(Math.abs(transaction.amount.toNumber()))}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>
    </div>
  );
}
