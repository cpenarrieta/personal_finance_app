import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { MonthFilter } from "@/components/dashboard/MonthFilter"
import { DashboardMetricsSection } from "@/components/dashboard/DashboardMetricsSection"
import { DashboardTopExpensesSection } from "@/components/dashboard/DashboardTopExpensesSection"
import { DashboardLastMonthSection } from "@/components/dashboard/DashboardLastMonthSection"
import {
  MetricCardsSkeleton,
  ChartsSkeleton,
  SectionSkeleton,
  TransactionTableSkeleton,
} from "@/components/dashboard/DashboardSkeletons"
import { CashflowSankeyChartAsync, CashflowSankeyChartSkeleton } from "@/components/charts"
import { hasConnectedAccounts } from "@/lib/dashboard/data"

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  robots: {
    index: false,
    follow: false,
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Check if user has connected accounts
  const hasConnected = await hasConnectedAccounts()
  if (!hasConnected) {
    redirect("/connect-account")
  }

  // Parse month filter from URL
  const params = await searchParams
  const monthsParam = typeof params.months === "string" ? params.months : "0"
  const monthsBack = ["0", "1", "2", "3", "6"].includes(monthsParam) ? parseInt(monthsParam, 10) : 0

  return (
    <div className="space-y-8">
      {/* Header with Greeting - static, renders immediately */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <DashboardHeader />
        <MonthFilter />
      </div>

      {/* Metrics Section - cached, streams in */}
      <section>
        <Suspense fallback={<MetricCardsSkeleton />}>
          <DashboardMetricsSection monthsBack={monthsBack} />
        </Suspense>
      </section>

      {/* Cashflow Visualization - cached, streams in */}
      <section>
        <Suspense fallback={<CashflowSankeyChartSkeleton />}>
          <CashflowSankeyChartAsync monthsBack={monthsBack} />
        </Suspense>
      </section>

      {/* Monthly Overview Charts - cached with nested Suspense */}
      <section>
        <Suspense fallback={<ChartsSkeleton />}>
          <DashboardLastMonthSection monthsBack={monthsBack} />
        </Suspense>
      </section>

      {/* Top Expenses Table - cached, streams in */}
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
