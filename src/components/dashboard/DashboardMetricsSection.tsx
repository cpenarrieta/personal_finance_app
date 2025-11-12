import { formatAmount } from "@/lib/utils"
import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, PiggyBank } from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { getDashboardMetrics, getLastMonthStats } from "@/lib/dashboard/data"
import { calculateTotalBalance, calculateInvestmentValue } from "@/lib/dashboard/calculations"
import { format, subMonths, startOfMonth } from "date-fns"
import { ErrorFallback } from "@/components/shared/ErrorFallback"

interface DashboardMetricsSectionProps {
  monthsBack?: number
}

/**
 * Async Server Component for Dashboard Metrics
 * Displays all 5 metric cards (balance, investments, spending, income, net)
 * Fetches data independently with "use cache" and error handling
 */
export async function DashboardMetricsSection({ monthsBack = 1 }: DashboardMetricsSectionProps) {
  try {
    const [{ accounts, holdings }, { totalLastMonthSpending, totalLastMonthIncome }] =
      await Promise.all([getDashboardMetrics(), getLastMonthStats(monthsBack)])

    const totalCurrent = calculateTotalBalance(accounts)
    const totalInvestmentValue = calculateInvestmentValue(holdings)
    const netIncome = totalLastMonthIncome - totalLastMonthSpending

    // Generate period labels
    const periodLabel = monthsBack === 1 ? "Last Month" : `Last ${monthsBack} Months`
    const now = new Date()
    const endMonth = format(subMonths(now, 1), "MMM yyyy")
    const startMonth = format(startOfMonth(subMonths(now, monthsBack)), "MMM yyyy")
    const subtitle = monthsBack === 1 ? endMonth : `${startMonth} - ${endMonth}`

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Balance"
          value={`$${formatAmount(totalCurrent)}`}
          subtitle={`${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
          icon={Wallet}
        />
        <MetricCard
          title="Investment Value"
          value={`$${formatAmount(totalInvestmentValue)}`}
          subtitle={`${holdings.length} holding${holdings.length !== 1 ? "s" : ""}`}
          icon={TrendingUp}
        />
        <MetricCard
          title={`${periodLabel} Spending`}
          value={`$${formatAmount(totalLastMonthSpending)}`}
          subtitle={subtitle}
          icon={ArrowDownCircle}
        />
        <MetricCard
          title={`${periodLabel} Income`}
          value={`$${formatAmount(totalLastMonthIncome)}`}
          subtitle={subtitle}
          icon={ArrowUpCircle}
          valueClassName="text-success"
        />
        <MetricCard
          title="Net Income"
          value={`${netIncome >= 0 ? "+" : ""}$${formatAmount(Math.abs(netIncome))}`}
          subtitle={subtitle}
          icon={PiggyBank}
          valueClassName={netIncome >= 0 ? "text-success" : "text-destructive"}
        />
      </div>
    )
  } catch (error) {
    console.error("Failed to load dashboard metrics:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load metrics"
        description="Unable to load account and investment data"
      />
    )
  }
}
