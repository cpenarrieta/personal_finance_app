import { redirect } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"

// Dashboard modules
import {
  hasConnectedAccounts,
  getStatsWithTrends,
  getTopExpensiveTransactions,
  getLastMonthStats,
} from "@/lib/dashboard/data"

// Async Server Components
import { DashboardMetricsSection } from "@/components/dashboard/DashboardMetricsSection"
import { DashboardLastMonthSection } from "@/components/dashboard/DashboardLastMonthSection"
import { DashboardTopExpensesSection } from "@/components/dashboard/DashboardTopExpensesSection"
import { MonthFilter } from "@/components/dashboard/MonthFilter"
import { CashflowSankeyChartAsync } from "@/components/dashboard/charts/CashflowSankeyChartAsync"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

// Skeleton loaders
import {
  MetricCardsSkeleton,
  ChartsSkeleton,
  SectionSkeleton,
  TransactionTableSkeleton,
} from "@/components/dashboard/DashboardSkeletons"

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  robots: {
    index: false,
    follow: false,
  },
}

interface PageProps {
  searchParams: Promise<{ months?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  // Check if user has connected Plaid accounts
  if (!(await hasConnectedAccounts())) {
    redirect("/connect-account")
  }

  // Parse month filter from searchParams
  const params = await searchParams
  const monthsParam = params.months || "0"
  const monthsBack = ["0", "1", "2", "3", "6"].includes(monthsParam) ? parseInt(monthsParam, 10) : 0

  // Pre-fetch data for all tabs on initial load to warm cache
  // Fire-and-forget - don't await, best-effort cache warming
  if (monthsBack === 0) {
    Promise.all([
      getStatsWithTrends(1),
      getStatsWithTrends(2),
      getStatsWithTrends(3),
      getStatsWithTrends(6),
      getTopExpensiveTransactions(1, 25),
      getTopExpensiveTransactions(2, 25),
      getTopExpensiveTransactions(3, 25),
      getTopExpensiveTransactions(6, 25),
      getLastMonthStats(1),
      getLastMonthStats(2),
      getLastMonthStats(3),
      getLastMonthStats(6),
    ]).catch(() => {
      // Silently ignore errors - cache warming is best-effort
    })
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
        <Suspense fallback={<MetricCardsSkeleton />}>
          <DashboardMetricsSection monthsBack={monthsBack} />
        </Suspense>
      </section>

      {/* Cashflow Visualization */}
      <section>
        <Suspense
          fallback={
            <SectionSkeleton title={false} subtitle={false}>
              <ChartsSkeleton />
            </SectionSkeleton>
          }
        >
          <CashflowSankeyChartAsync monthsBack={monthsBack} />
        </Suspense>
      </section>

      {/* Monthly Overview Charts */}
      <section>
        <Suspense
          fallback={
            <SectionSkeleton title subtitle>
              <ChartsSkeleton />
            </SectionSkeleton>
          }
        >
          <DashboardLastMonthSection monthsBack={monthsBack} />
        </Suspense>
      </section>

      {/* Top Expenses Table */}
      <section>
        <Suspense
          fallback={
            <SectionSkeleton title subtitle>
              <TransactionTableSkeleton rows={25} />
            </SectionSkeleton>
          }
        >
          <DashboardTopExpensesSection monthsBack={monthsBack} />
        </Suspense>
      </section>
    </div>
  )
}
