/**
 * Chart-related constants
 * Using CSS custom properties for theme consistency
 */

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
] as const

export const SEMANTIC_COLORS = {
  income: "hsl(var(--success))",
  expense: "hsl(var(--destructive))",
  primary: "hsl(var(--primary))",
} as const

export type ChartTab =
  | "subcategories"
  | "monthly-comparison"
  | "spending-trends"
  | "income-vs-expenses"
  | "category-breakdown"

export const CHART_TABS = [
  { id: "subcategories" as ChartTab, name: "Subcategories", icon: "📊" },
  { id: "monthly-comparison" as ChartTab, name: "Monthly Comparison", icon: "📅" },
  { id: "spending-trends" as ChartTab, name: "Spending Trends", icon: "📈" },
  { id: "income-vs-expenses" as ChartTab, name: "Income vs Expenses", icon: "💰" },
  { id: "category-breakdown" as ChartTab, name: "Category Breakdown", icon: "🥧" },
] as const
