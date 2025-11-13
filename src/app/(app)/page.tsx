import { redirect } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"

// Dashboard modules
import { hasConnectedAccounts } from "@/lib/dashboard/data"

// Async Server Components
import { DashboardMetricsSection } from "@/components/dashboard/DashboardMetricsSection"
import { DashboardLastMonthSection } from "@/components/dashboard/DashboardLastMonthSection"
import { DashboardTopExpensesSection } from "@/components/dashboard/DashboardTopExpensesSection"
import { MonthFilter } from "@/components/dashboard/MonthFilter"

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

  return (
    <div className="space-y-6">
      <MonthFilter />

      <Suspense fallback={<MetricCardsSkeleton />}>
        <DashboardMetricsSection monthsBack={monthsBack} />
      </Suspense>

      <Suspense
        fallback={
          <SectionSkeleton title subtitle>
            <ChartsSkeleton />
          </SectionSkeleton>
        }
      >
        <DashboardLastMonthSection monthsBack={monthsBack} />
      </Suspense>

      <Suspense
        fallback={
          <SectionSkeleton title subtitle>
            <TransactionTableSkeleton rows={25} />
          </SectionSkeleton>
        }
      >
        <DashboardTopExpensesSection monthsBack={monthsBack} />
      </Suspense>
    </div>
  )
}
