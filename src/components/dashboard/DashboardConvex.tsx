"use client"

import { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useSearchParams, useRouter } from "next/navigation"
import { format, subMonths, startOfMonth } from "date-fns"
import { formatAmount } from "@/lib/utils"
import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, PiggyBank, ClipboardCheck } from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { TransactionTable } from "@/components/dashboard/TransactionTable"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { MonthFilter } from "@/components/dashboard/MonthFilter"
import { calculateTotalBalance, calculateInvestmentValue } from "@/lib/dashboard/calculations"
import {
  MetricCardsSkeleton,
  TransactionTableSkeleton,
  SectionSkeleton,
} from "@/components/dashboard/DashboardSkeletons"
import {
  SpendingByCategoryChartConvex,
  SubcategoryChartConvex,
  DailySpendingChartConvex,
  CashflowSankeyChartConvex,
} from "@/components/charts/ChartsConvex"

function DashboardMetricsSectionConvex({ monthsBack }: { monthsBack: number }) {
  const metricsData = useQuery(api.dashboard.getMetrics)
  const statsData = useQuery(api.dashboard.getStatsWithTrends, { monthsBack })
  const reviewCount = useQuery(api.dashboard.getReviewCount)

  if (metricsData === undefined || statsData === undefined || reviewCount === undefined) {
    return <MetricCardsSkeleton />
  }

  const { accounts, holdings } = metricsData
  const totalCurrent = calculateTotalBalance(accounts as any)
  const totalInvestmentValue = calculateInvestmentValue(holdings as any)

  const { current } = statsData
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
        value={reviewCount}
        subtitle={reviewCount === 1 ? "transaction needs review" : "transactions need review"}
        icon={ClipboardCheck}
        href="/review-transactions"
        valueClassName={reviewCount > 0 ? "text-destructive" : "text-success"}
        accentColor={reviewCount > 0 ? "warning" : "success"}
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
}

function DashboardTopExpensesSectionConvex({ monthsBack }: { monthsBack: number }) {
  const topExpenses = useQuery(api.dashboard.getTopExpensiveTransactions, {
    monthsBack,
    limit: 25,
  })

  // Generate period labels
  const now = new Date()
  let periodLabel: string
  let title: string
  let subtitle: string

  if (monthsBack === 0) {
    periodLabel = format(now, "MMMM yyyy")
    title = `Top Expenses ${periodLabel}`
    subtitle = `Most expensive transactions in ${periodLabel.toLowerCase()}`
  } else if (monthsBack === 1) {
    periodLabel = format(subMonths(now, 1), "MMMM yyyy")
    title = `Top Expenses ${periodLabel}`
    subtitle = `Most expensive transactions in ${periodLabel.toLowerCase()}`
  } else {
    const endMonth = format(subMonths(now, 1), "MMMM yyyy")
    const startMonth = format(startOfMonth(subMonths(now, monthsBack)), "MMMM yyyy")
    periodLabel = `${startMonth} - ${endMonth}`
    title = `Top Expenses ${periodLabel}`
    subtitle = `Most expensive transactions in ${periodLabel.toLowerCase()}`
  }

  if (topExpenses === undefined) {
    return (
      <SectionSkeleton title subtitle>
        <TransactionTableSkeleton rows={25} />
      </SectionSkeleton>
    )
  }

  // Transform Convex data to TransactionTable format
  const transformedTransactions = topExpenses.map((tx: any) => ({
    id: tx.id,
    name: tx.name,
    merchantName: tx.merchantName,
    amount_number: tx.amount_number,
    datetime: tx.datetime,
    account: tx.account ? { id: tx.account.id, name: tx.account.name } : { id: "", name: "Unknown" },
    category: tx.category ? { id: tx.category.id, name: tx.category.name } : null,
    subcategory: tx.subcategory ? { id: tx.subcategory.id, name: tx.subcategory.name } : null,
    tags: (tx.tags || []).map((t: any) => ({ tag: { id: t.id, name: t.name, color: t.color } })),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <TransactionTable transactions={transformedTransactions} showCategory={true} />
    </div>
  )
}

function DashboardLastMonthSectionConvex({ monthsBack }: { monthsBack: number }) {
  // Generate period labels
  const now = new Date()
  let periodLabel: string
  let subtitle: string

  if (monthsBack === 0) {
    periodLabel = "Current Month Overview"
    subtitle = `${format(now, "MMMM yyyy")} Financial Analysis`
  } else if (monthsBack === 1) {
    periodLabel = "Last Month Overview"
    subtitle = `${format(subMonths(now, 1), "MMMM yyyy")} Financial Analysis`
  } else {
    periodLabel = `Last ${monthsBack} Months Overview`
    const endMonth = format(subMonths(now, 1), "MMMM yyyy")
    const startMonth = format(startOfMonth(subMonths(now, monthsBack)), "MMMM yyyy")
    subtitle = `${startMonth} - ${endMonth} Financial Analysis`
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">{periodLabel}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SpendingByCategoryChartConvex monthsBack={monthsBack} />
        <SubcategoryChartConvex monthsBack={monthsBack} />
        <DailySpendingChartConvex monthsBack={monthsBack} />
      </div>
    </div>
  )
}

export function DashboardConvex() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const monthsParam = searchParams.get("months") || "0"
  const monthsBack = ["0", "1", "2", "3", "6"].includes(monthsParam) ? parseInt(monthsParam, 10) : 0

  // Check if user has connected accounts
  const hasConnected = useQuery(api.dashboard.hasConnectedItems)

  // Redirect if no connected accounts
  useEffect(() => {
    if (hasConnected === false) {
      router.push("/connect-account")
    }
  }, [hasConnected, router])

  if (hasConnected === undefined || hasConnected === false) {
    return (
      <div className="space-y-8">
        <MetricCardsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <DashboardHeader />
        <MonthFilter />
      </div>

      {/* Metrics Section */}
      <section>
        <DashboardMetricsSectionConvex monthsBack={monthsBack} />
      </section>

      {/* Cashflow Visualization */}
      <section>
        <CashflowSankeyChartConvex monthsBack={monthsBack} />
      </section>

      {/* Monthly Overview Charts */}
      <section>
        <DashboardLastMonthSectionConvex monthsBack={monthsBack} />
      </section>

      {/* Top Expenses Table */}
      <section>
        <DashboardTopExpensesSectionConvex monthsBack={monthsBack} />
      </section>
    </div>
  )
}
