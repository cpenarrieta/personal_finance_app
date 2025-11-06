import { format } from "date-fns";
import { Suspense } from "react";
import { getLastMonthStats } from "@/lib/dashboard/data";
import { SpendingByCategoryChartAsync } from "@/components/dashboard/charts/SpendingByCategoryChartAsync";
import { SubcategoryChartAsync } from "@/components/dashboard/charts/SubcategoryChartAsync";
import { DailySpendingChartAsync } from "@/components/dashboard/charts/DailySpendingChartAsync";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for individual chart
 */
function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Server Component for Last Month Overview section header
 * Shows header immediately while charts stream in independently
 */
export async function DashboardLastMonthSection() {
  const { lastMonthStart } = await getLastMonthStats();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Last Month Overview</h2>
        <p className="text-muted-foreground">
          {format(lastMonthStart, "MMMM yyyy")} Financial Analysis
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<ChartSkeleton />}>
          <SpendingByCategoryChartAsync />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <SubcategoryChartAsync />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <DailySpendingChartAsync />
        </Suspense>
      </div>
    </div>
  );
}
