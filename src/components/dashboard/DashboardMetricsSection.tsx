import { formatAmount } from "@/lib/utils"
import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, PiggyBank, ClipboardCheck } from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { getDashboardMetrics, getStatsWithTrends, getUncategorizedTransactions } from "@/lib/dashboard/data"
import { calculateTotalBalance, calculateInvestmentValue } from "@/lib/dashboard/calculations"
import { format, subMonths, startOfMonth } from "date-fns"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface DashboardMetricsSectionProps {
  monthsBack?: number
}

/**
 * Async Server Component for Dashboard Metrics
 * Displays all 6 metric cards (balance, investments, spending, income, net, transactions for review)
 * Fetches data independently with "use cache" and error handling
 */
export async function DashboardMetricsSection({ monthsBack = 0 }: DashboardMetricsSectionProps) {
  try {
    const [{ accounts, holdings }, statsWithTrends, { uncategorizedCount }] = await Promise.all([
      getDashboardMetrics(),
      getStatsWithTrends(monthsBack),
      getUncategorizedTransactions(),
    ])

    const totalCurrent = calculateTotalBalance(accounts)
    const totalInvestmentValue = calculateInvestmentValue(holdings)

    const { current } = statsWithTrends
    const netIncome = current.income - current.spending

    // Generate period labels
    const now = new Date()
    let periodLabel: string
    let subtitle: string

    if (monthsBack === 0) {
      periodLabel = "Current Month"
      subtitle = format(now, "MMM yyyy")
    } else if (monthsBack === 1) {
      periodLabel = "Last Month"
      subtitle = format(subMonths(now, 1), "MMM yyyy")
    } else {
      periodLabel = `Last ${monthsBack} Months`
      const endMonth = format(subMonths(now, 1), "MMM yyyy")
      const startMonth = format(startOfMonth(subMonths(now, monthsBack)), "MMM yyyy")
      subtitle = `${startMonth} - ${endMonth}`
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          title="Transactions for Review"
          value={uncategorizedCount}
          subtitle={uncategorizedCount === 1 ? "transaction needs review" : "transactions need review"}
          icon={ClipboardCheck}
          href="/review-transactions"
          valueClassName={uncategorizedCount > 0 ? "text-destructive" : "text-success"}
        />
        <MetricCard
          title={`${periodLabel} Spending`}
          value={`$${formatAmount(current.spending)}`}
          subtitle={subtitle}
          icon={ArrowDownCircle}
        />
        <MetricCard
          title={`${periodLabel} Income`}
          value={`$${formatAmount(current.income)}`}
          subtitle={subtitle}
          icon={ArrowUpCircle}
          valueClassName="text-success"
        />
        <MetricCard
          title="Net Income"
          value={`${netIncome >= 0 ? "+" : "-"}$${formatAmount(Math.abs(netIncome))}`}
          subtitle={subtitle}
          icon={PiggyBank}
          valueClassName={netIncome >= 0 ? "text-success" : "text-destructive"}
        />
      </div>
    )
  } catch (error) {
    logError("Failed to load dashboard metrics:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load metrics"
        description="Unable to load account and investment data"
      />
    )
  }
}
