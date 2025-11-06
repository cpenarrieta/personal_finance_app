import { formatAmount } from "@/lib/utils";
import { Wallet, TrendingUp, DollarSign } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { getDashboardMetrics, getLastMonthStats } from "@/lib/dashboard/data";
import {
  calculateTotalBalance,
  calculateInvestmentValue,
} from "@/lib/dashboard/calculations";
import { format } from "date-fns";

/**
 * Async Server Component for Dashboard Metrics
 * Displays all 4 metric cards (balance, investments, spending, income)
 * Fetches data independently with "use cache"
 */
export async function DashboardMetricsSection() {
  const [{ accounts, holdings }, { totalLastMonthSpending, totalLastMonthIncome, lastMonthStart }] =
    await Promise.all([getDashboardMetrics(), getLastMonthStats()]);

  const totalCurrent = calculateTotalBalance(accounts);
  const totalInvestmentValue = calculateInvestmentValue(holdings);

  return (
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
  );
}
