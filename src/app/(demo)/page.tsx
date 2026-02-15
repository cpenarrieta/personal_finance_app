import type { Metadata } from "next"
import { Suspense } from "react"
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
import { DemoDashboardMetricsSection } from "@/components/demo/DemoDashboardMetrics"
import { DemoDashboardTopExpensesSection } from "@/components/demo/DemoDashboardTopExpenses"
import { DemoCashflowSankeyChartAsync } from "@/components/demo/DemoCashflowSankey"

export const metadata: Metadata = {
  title: "Demo Dashboard | Personal Finance",
  robots: {
    index: true,
    follow: false,
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DemoDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const monthsParam = typeof params.months === "string" ? params.months : "0"
  const monthsBack = ["0", "1", "2", "3", "6"].includes(monthsParam) ? parseInt(monthsParam, 10) : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <DashboardHeader />
        <MonthFilter />
      </div>

      <section>
        <Suspense fallback={<MetricCardsSkeleton />}>
          <DemoDashboardMetricsSection monthsBack={monthsBack} />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<CashflowSankeyChartSkeleton />}>
          <DemoCashflowSankeyChartAsync monthsBack={monthsBack} />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<ChartsSkeleton />}>
          <DashboardLastMonthSection monthsBack={monthsBack} />
        </Suspense>
      </section>

      <section>
        <Suspense
          fallback={
            <SectionSkeleton title subtitle>
              <TransactionTableSkeleton rows={25} />
            </SectionSkeleton>
          }
        >
          <DemoDashboardTopExpensesSection monthsBack={monthsBack} />
        </Suspense>
      </section>
    </div>
  )
}
