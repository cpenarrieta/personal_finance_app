"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface SubcategoryChartProps {
  data: Array<{ name: string; value: number }>
}

export function SubcategoryChart({ data }: SubcategoryChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0)

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Subcategories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Subcategories</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={100} />
            <Tooltip
              formatter={(value: number) =>
                `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
              }}
            />
            <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
