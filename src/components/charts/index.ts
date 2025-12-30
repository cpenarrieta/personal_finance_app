/**
 * Chart components index
 *
 * Each chart has three parts:
 * - Base component (client-side): CashflowSankeyChart
 * - Async wrapper (server-side): CashflowSankeyChartAsync
 * - Skeleton (loading state): CashflowSankeyChartSkeleton
 */

// Base chart components (client-side)
export { CashflowSankeyChart } from "./CashflowSankeyChart"
export { DailySpendingChart } from "./DailySpendingChart"
export { SpendingByCategoryChart } from "./SpendingByCategoryChart"
export { SubcategoryChart } from "./SubcategoryChart"
export { IncomeVsExpenseChart } from "./IncomeVsExpenseChart"
export { MonthlyTrendChart } from "./MonthlyTrendChart"

// Async server components (data fetching wrappers)
export { CashflowSankeyChartAsync } from "./CashflowSankeyChart.async"
export { DailySpendingChartAsync } from "./DailySpendingChart.async"
export { SpendingByCategoryChartAsync } from "./SpendingByCategoryChart.async"
export { SubcategoryChartAsync } from "./SubcategoryChart.async"

// Skeleton components (loading states)
export { CashflowSankeyChartSkeleton } from "./CashflowSankeyChart.skeleton"
export { DailySpendingChartSkeleton } from "./DailySpendingChart.skeleton"
export { SpendingByCategoryChartSkeleton } from "./SpendingByCategoryChart.skeleton"
export { SubcategoryChartSkeleton } from "./SubcategoryChart.skeleton"
