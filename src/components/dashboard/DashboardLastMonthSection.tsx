import { format, startOfMonth, subMonths } from "date-fns"
import { Suspense } from "react"
import { SpendingByCategoryChartAsync } from "@/components/dashboard/charts/SpendingByCategoryChartAsync"
import { SubcategoryChartAsync } from "@/components/dashboard/charts/SubcategoryChartAsync"
import { DailySpendingChartAsync } from "@/components/dashboard/charts/DailySpendingChartAsync"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardLastMonthSectionProps {
  monthsBack?: number
}

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
  )
}

/**
 * Server Component for Last Month Overview section header
 * Shows header immediately while charts stream in independently
 */
export async function DashboardLastMonthSection({ monthsBack = 0 }: DashboardLastMonthSectionProps) {
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
        <Suspense fallback={<ChartSkeleton />}>
          <SpendingByCategoryChartAsync monthsBack={monthsBack} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <SubcategoryChartAsync monthsBack={monthsBack} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <DailySpendingChartAsync monthsBack={monthsBack} />
        </Suspense>
      </div>
    </div>
  )
}
