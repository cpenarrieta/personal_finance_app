"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import {
  prepareSpendingByCategory,
  prepareSpendingBySubcategory,
  prepareDailySpendingData,
  prepareCashflowSankeyData,
} from "@/lib/dashboard/calculations"
import { SpendingByCategoryChart } from "./SpendingByCategoryChart"
import { SubcategoryChart } from "./SubcategoryChart"
import { DailySpendingChart } from "./DailySpendingChart"
import { CashflowSankeyChart } from "./CashflowSankeyChart"
import { SpendingByCategoryChartSkeleton } from "./SpendingByCategoryChart.skeleton"
import { SubcategoryChartSkeleton } from "./SubcategoryChart.skeleton"
import { DailySpendingChartSkeleton } from "./DailySpendingChart.skeleton"
import { CashflowSankeyChartSkeleton } from "./CashflowSankeyChart.skeleton"

interface ChartProps {
  monthsBack?: number
}

/**
 * Convex wrapper for Spending by Category Chart
 */
export function SpendingByCategoryChartConvex({ monthsBack = 0 }: ChartProps) {
  const data = useQuery(api.dashboard.getLastMonthStats, { monthsBack })

  if (data === undefined) {
    return <SpendingByCategoryChartSkeleton />
  }

  // Transform data for the chart
  const chartData = prepareSpendingByCategory(data.lastMonthTransactions as any, 10)

  return <SpendingByCategoryChart data={chartData} />
}

/**
 * Convex wrapper for Subcategory Chart
 */
export function SubcategoryChartConvex({ monthsBack = 0 }: ChartProps) {
  const data = useQuery(api.dashboard.getLastMonthStats, { monthsBack })

  if (data === undefined) {
    return <SubcategoryChartSkeleton />
  }

  // Transform data for the chart
  const chartData = prepareSpendingBySubcategory(data.lastMonthTransactions as any, 10)

  return <SubcategoryChart data={chartData} />
}

/**
 * Convex wrapper for Daily Spending Chart
 */
export function DailySpendingChartConvex({ monthsBack = 0 }: ChartProps) {
  const data = useQuery(api.dashboard.getLastMonthStats, { monthsBack })

  if (data === undefined) {
    return <DailySpendingChartSkeleton />
  }

  // Transform data for the chart
  const chartData = prepareDailySpendingData(data.lastMonthTransactions as any, data.lastMonthStart, data.lastMonthEnd)

  return <DailySpendingChart data={chartData} />
}

/**
 * Convex wrapper for Cashflow Sankey Chart
 */
export function CashflowSankeyChartConvex({ monthsBack = 0 }: ChartProps) {
  const data = useQuery(api.dashboard.getLastMonthStats, { monthsBack })

  if (data === undefined) {
    return <CashflowSankeyChartSkeleton />
  }

  // Transform data for the chart
  const sankeyData = prepareCashflowSankeyData(data.lastMonthTransactions as any)

  return <CashflowSankeyChart data={sankeyData} />
}
