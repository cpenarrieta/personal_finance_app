"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { formatAmount } from "@/lib/utils"
import type { IncomeVsExpensesDataItem } from "@/hooks/useChartData"

interface IncomeVsExpensesChartTabProps {
  data: IncomeVsExpensesDataItem[]
}

export function IncomeVsExpensesChartTab({ data }: IncomeVsExpensesChartTabProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No data available</p>
  }

  const pieData = data.filter((d) => d.name !== "Net")

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Income vs Expenses Overview</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: { name?: unknown; percent?: number }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.name === "Income" ? "var(--chart-1)" : "hsl(var(--destructive))"}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col justify-center space-y-4">
          {data.map((item, index) => (
            <div key={index} className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">{item.name}</div>
              <div
                className={`text-2xl font-bold ${
                  item.name === "Income"
                    ? "text-success"
                    : item.name === "Expenses"
                      ? ""
                      : item.value >= 0
                        ? "text-success"
                        : ""
                }`}
              >
                {item.name !== "Net" && item.name === "Expenses" ? "-" : item.value >= 0 ? "+" : ""}$
                {formatAmount(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
