"use client"

import Image from "next/image"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"
import type { SubcategoryDataItem } from "@/hooks/useChartData"

interface SubcategoryChartTabProps {
  data: SubcategoryDataItem[]
}

export function SubcategoryChartTab({ data }: SubcategoryChartTabProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No data available</p>
  }

  const total = data.reduce((sum, s) => sum + s.value, 0)

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Spending by Subcategory</h3>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 400)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
          <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Subcategory Summary Table */}
      <div className="mt-6">
        <h4 className="text-md font-medium mb-3">Detailed Breakdown</h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Subcategory</TableHead>
                <TableHead className="text-left">Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((sub, index) => {
                const percentage = (sub.value / total) * 100
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {sub.imageUrl && (
                          <Image
                            src={sub.imageUrl}
                            alt={sub.name}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded"
                          />
                        )}
                        {sub.name}
                      </div>
                    </TableCell>
                    <TableCell>{sub.categoryName}</TableCell>
                    <TableCell className="text-right">${formatAmount(sub.value)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
