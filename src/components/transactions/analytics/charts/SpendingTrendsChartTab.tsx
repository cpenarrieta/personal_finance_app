"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import type { SpendingTrendsDataItem } from "@/hooks/useChartData"

interface SpendingTrendsChartTabProps {
  data: SpendingTrendsDataItem[]
}

export function SpendingTrendsChartTab({ data }: SpendingTrendsChartTabProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No data available</p>
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Spending Trends Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
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
          <Legend />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="var(--chart-3)"
            strokeWidth={2}
            name="Spending"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
