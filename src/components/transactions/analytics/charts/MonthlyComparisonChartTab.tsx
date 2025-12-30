"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"
import type { MonthlyComparisonDataItem } from "@/hooks/useChartData"

interface MonthlyComparisonChartTabProps {
  data: MonthlyComparisonDataItem[]
}

export function MonthlyComparisonChartTab({ data }: MonthlyComparisonChartTabProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No data available</p>
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Monthly Income vs Expenses (Last 12 Months)</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
          <Legend />
          <Bar dataKey="income" fill="var(--chart-1)" name="Income" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6">
        <h4 className="text-md font-medium mb-3">Monthly Summary</h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((month, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{month.month}</TableCell>
                  <TableCell className="text-right text-success">${formatAmount(month.income)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    ${formatAmount(month.expenses)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${month.net >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {month.net >= 0 ? "+" : ""}${formatAmount(Math.abs(month.net))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
