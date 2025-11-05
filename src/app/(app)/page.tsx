import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { formatAmount } from "@/lib/utils";
import type { Metadata } from "next";
import { Wallet, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dashboard modules
import {
  hasConnectedAccounts,
  getDashboardMetrics,
  getUncategorizedTransactions,
  getRecentTransactions,
  getLastMonthStats,
  getTopExpensiveTransactions,
} from "@/lib/dashboard/data";
import {
  calculateTotalBalance,
  calculateInvestmentValue,
  prepareSpendingByCategory,
  prepareSpendingBySubcategory,
  prepareDailySpendingData,
} from "@/lib/dashboard/calculations";

// Components
import { MetricCard } from "@/components/MetricCard";
import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart";
import { SubcategoryChart } from "@/components/charts/SubcategoryChart";
import { DailySpendingChart } from "@/components/charts/DailySpendingChart";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { UncategorizedTransactionsSection } from "@/components/dashboard/UncategorizedTransactionsSection";

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page() {
  // Check if user has connected Plaid accounts
  if (!(await hasConnectedAccounts())) {
    redirect("/connect-account");
  }

  // Fetch all data in parallel for optimal performance
  const [
    { accounts, holdings },
    { uncategorizedCount, uncategorizedTransactions },
    recentTransactions,
    {
      totalLastMonthSpending,
      totalLastMonthIncome,
      lastMonthTransactions,
      lastMonthStart,
      lastMonthEnd,
    },
    topExpensiveTransactions,
  ] = await Promise.all([
    getDashboardMetrics(),
    getUncategorizedTransactions(),
    getRecentTransactions(20),
    getLastMonthStats(),
    getTopExpensiveTransactions(25),
  ]);

  // Calculate metrics
  const totalCurrent = calculateTotalBalance(accounts);
  const totalInvestmentValue = calculateInvestmentValue(holdings);

  // Prepare chart data
  const spendingByCategory = prepareSpendingByCategory(
    lastMonthTransactions,
    10
  );
  const spendingBySubcategory = prepareSpendingBySubcategory(
    lastMonthTransactions,
    10
  );
  const dailySpendingData = prepareDailySpendingData(
    lastMonthTransactions,
    lastMonthStart,
    lastMonthEnd
  );

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
          valueClassName="text-destructive"
        />
        <MetricCard
          title="Last Month Income"
          value={`$${formatAmount(totalLastMonthIncome)}`}
          subtitle={format(lastMonthStart, "MMMM yyyy")}
          icon={DollarSign}
          valueClassName="text-success"
        />
      </div>

      {/* Uncategorized Transactions Section */}
      <UncategorizedTransactionsSection
        count={uncategorizedCount}
        transactions={uncategorizedTransactions}
        displayLimit={10}
      />

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
        <TransactionTable
          transactions={recentTransactions}
          showCategory={true}
        />
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
          <h2 className="text-2xl font-semibold">
            Top Expenses {format(lastMonthStart, "MMMM yyyy")}
          </h2>
          <p className="text-muted-foreground">
            Most expensive transactions in {format(lastMonthStart, "MMMM yyyy")}
          </p>
        </div>
        <TransactionTable
          transactions={topExpensiveTransactions}
          showCategory={true}
        />
      </div>
    </div>
  );
}
