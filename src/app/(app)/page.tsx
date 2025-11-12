import { redirect } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"

// Dashboard modules
import { hasConnectedAccounts } from "@/lib/dashboard/data"

// Async Server Components
import { DashboardMetricsSection } from "@/components/dashboard/DashboardMetricsSection"
import { DashboardUncategorizedSection } from "@/components/dashboard/DashboardUncategorizedSection"
import { DashboardRecentTransactionsSection } from "@/components/dashboard/DashboardRecentTransactionsSection"
import { DashboardLastMonthSection } from "@/components/dashboard/DashboardLastMonthSection"
import { DashboardTopExpensesSection } from "@/components/dashboard/DashboardTopExpensesSection"
import { MonthFilter } from "@/components/dashboard/MonthFilter"

// Skeleton loaders
import {
  MetricCardsSkeleton,
  UncategorizedSectionSkeleton,
  TransactionTableSkeleton,
  ChartsSkeleton,
  SectionSkeleton,
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
  const monthsParam = params.months || "1"
  const monthsBack = ["1", "2", "3", "6"].includes(monthsParam) ? parseInt(monthsParam, 10) : 1

  return (
    <div className="space-y-6">
      <MonthFilter />

      <Suspense fallback={<MetricCardsSkeleton />}>
        <DashboardMetricsSection monthsBack={monthsBack} />
      </Suspense>

      <Suspense fallback={<UncategorizedSectionSkeleton />}>
        <DashboardUncategorizedSection />
      </Suspense>

      <Suspense
        fallback={
          <SectionSkeleton title subtitle button>
            <TransactionTableSkeleton rows={20} />
          </SectionSkeleton>
        }
      >
        <DashboardRecentTransactionsSection />
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
