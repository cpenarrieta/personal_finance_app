"use client"

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

// Default colors for charts (following project color scheme)
const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

interface ChartData {
  label: string
  value: number
  color?: string
}

interface ChartRendererProps {
  type: "bar" | "line" | "pie" | "area"
  title: string
  description?: string
  data: ChartData[]
  xAxisLabel?: string
  yAxisLabel?: string
  formatValue?: "currency" | "number" | "percentage"
}

export function ChartRenderer({
  type,
  title,
  description,
  data,
  xAxisLabel,
  yAxisLabel,
  formatValue = "currency",
}: ChartRendererProps) {
  // Transform data for recharts format
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }))

  // Create chart config
  const chartConfig: ChartConfig = data.reduce(
    (acc, item, index) => {
      const key = `item${index}`
      acc[key] = {
        label: item.label,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }
      return acc
    },
    {} as ChartConfig,
  )

  // Value formatter
  const formatValueFn = (value: number) => {
    switch (formatValue) {
      case "currency":
        return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      case "percentage":
        return `${value.toFixed(1)}%`
      case "number":
      default:
        return value.toLocaleString()
    }
  }

  return (
    <div className="w-full space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        {type === "bar" && (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5 } : undefined}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValueFn}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => formatValueFn(value as number)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        )}

        {type === "line" && (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5 } : undefined}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValueFn}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => formatValueFn(value as number)} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )}

        {type === "area" && (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5 } : undefined}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValueFn}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => formatValueFn(value as number)} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
            />
          </AreaChart>
        )}

        {type === "pie" && (
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => formatValueFn(value as number)} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.name}: ${formatValueFn(entry.value)}`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        )}
      </ChartContainer>
    </div>
  )
}
