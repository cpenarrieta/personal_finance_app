"use client"

import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

interface MonthlyDataItem {
  month: string
  amount: number
}

interface AnalyticsMonthlyChartProps {
  monthlyData: MonthlyDataItem[]
}

/**
 * Monthly spending trend bar chart
 */
export function AnalyticsMonthlyChart({ monthlyData }: AnalyticsMonthlyChartProps) {
  if (monthlyData.length === 0) return null

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Spending Trend Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            formatter={(value: number) =>
              `$${value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            }
          />
          <Bar dataKey="amount" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
