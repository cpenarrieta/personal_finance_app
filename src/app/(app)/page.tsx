import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

// Dashboard modules
import { hasConnectedAccounts } from "@/lib/dashboard/data";

// Async Server Components
import { DashboardMetricsSection } from "@/components/dashboard/DashboardMetricsSection";
import { DashboardUncategorizedSection } from "@/components/dashboard/DashboardUncategorizedSection";
import { DashboardRecentTransactionsSection } from "@/components/dashboard/DashboardRecentTransactionsSection";
import { DashboardLastMonthSection } from "@/components/dashboard/DashboardLastMonthSection";
import { DashboardTopExpensesSection } from "@/components/dashboard/DashboardTopExpensesSection";

// Skeleton loaders
import {
  MetricCardsSkeleton,
  UncategorizedSectionSkeleton,
  TransactionTableSkeleton,
  ChartsSkeleton,
  SectionSkeleton,
} from "@/components/dashboard/DashboardSkeletons";

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page() {
  // Check if user has connected Plaid accounts
  if (!(await hasConnectedAccounts())) {
    redirect("/connect-account");
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<MetricCardsSkeleton />}>
        <DashboardMetricsSection />
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
        <DashboardLastMonthSection />
      </Suspense>

      <Suspense
        fallback={
          <SectionSkeleton title subtitle>
            <TransactionTableSkeleton rows={25} />
          </SectionSkeleton>
        }
      >
        <DashboardTopExpensesSection />
      </Suspense>
    </div>
  );
}
