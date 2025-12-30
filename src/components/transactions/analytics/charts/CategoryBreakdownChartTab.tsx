"use client"

import Image from "next/image"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { formatAmount } from "@/lib/utils"
import { CHART_COLORS } from "@/lib/constants/charts"
import type { CategoryDataItem } from "@/hooks/useChartData"

interface CategoryBreakdownChartTabProps {
  data: CategoryDataItem[]
}

export function CategoryBreakdownChartTab({ data }: CategoryBreakdownChartTabProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No data available</p>
  }

  const total = data.reduce((sum, c) => sum + c.value, 0)

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: { name?: unknown; percent?: number }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          <h4 className="text-md font-medium mb-3">Category Summary</h4>
          {data.map((cat, index) => {
            const percentage = (cat.value / total) * 100
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  {cat.imageUrl && (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.name}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded flex-shrink-0"
                    />
                  )}
                  <span className="text-sm text-muted-foreground truncate">{cat.name}</span>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className="text-sm font-medium text-foreground">${formatAmount(cat.value)}</div>
                  <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
