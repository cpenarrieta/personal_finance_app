import { formatAmount } from "@/lib/utils"
import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, PiggyBank, ClipboardCheck } from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { getDemoDashboardMetrics, getDemoStatsWithTrends } from "@/lib/demo/data"
import { calculateTotalBalance, calculateInvestmentValue } from "@/lib/dashboard/calculations"
import { format, subMonths, startOfMonth } from "date-fns"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface DemoDashboardMetricsSectionProps {
  monthsBack?: number
}

export async function DemoDashboardMetricsSection({ monthsBack = 0 }: DemoDashboardMetricsSectionProps) {
  try {
    const [{ accounts, holdings }, statsWithTrends] = await Promise.all([
      getDemoDashboardMetrics(),
      getDemoStatsWithTrends(monthsBack),
    ])

    const totalCurrent = calculateTotalBalance(accounts)
    const totalInvestmentValue = calculateInvestmentValue(holdings)

    const { current } = statsWithTrends as any
    const netIncome = current.income - current.spending

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
          accentColor="default"
        />
        <MetricCard
          title="Investment Value"
          value={`$${formatAmount(totalInvestmentValue)}`}
          subtitle={`${holdings.length} holding${holdings.length !== 1 ? "s" : ""}`}
          icon={TrendingUp}
          accentColor="success"
        />
        <MetricCard
          title="Transactions for Review"
          value={0}
          subtitle="transactions need review"
          icon={ClipboardCheck}
          href="/demo/review-transactions"
          accentColor="success"
        />
        <MetricCard
          title={`${periodLabel} Spending`}
          value={`$${formatAmount(current.spending)}`}
          subtitle={subtitle}
          icon={ArrowDownCircle}
          accentColor="destructive"
        />
        <MetricCard
          title={`${periodLabel} Income`}
          value={`$${formatAmount(current.income)}`}
          subtitle={subtitle}
          icon={ArrowUpCircle}
          valueClassName="text-success"
          accentColor="success"
        />
        <MetricCard
          title="Net Income"
          value={`${netIncome >= 0 ? "+" : "-"}$${formatAmount(Math.abs(netIncome))}`}
          subtitle={subtitle}
          icon={PiggyBank}
          valueClassName={netIncome >= 0 ? "text-success" : "text-destructive"}
          accentColor={netIncome >= 0 ? "success" : "destructive"}
        />
      </div>
    )
  } catch (error) {
    logError("Failed to load demo dashboard metrics:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load metrics"
        description="Unable to load demo account and investment data"
      />
    )
  }
}
