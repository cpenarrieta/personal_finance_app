"use client"

import Image from "next/image"
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { formatAmount } from "@/lib/utils"

interface CategoryDataItem {
  name: string
  value: number
  imageUrl?: string
}

interface AnalyticsCategoryChartsProps {
  categoryData: CategoryDataItem[]
  subcategoryData: CategoryDataItem[]
}

/**
 * Category and subcategory breakdown bar charts
 */
export function AnalyticsCategoryCharts({ categoryData, subcategoryData }: AnalyticsCategoryChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Category Breakdown Bar Chart */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Spending by Category (Top 10)</h3>
        {categoryData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={Math.max(categoryData.length * 50, 300)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>

            {/* Category Summary */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {categoryData.slice(0, 5).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {cat.imageUrl && (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded flex-shrink-0"
                      />
                    )}
                    <span className="text-muted-foreground truncate">{cat.name}</span>
                  </div>
                  <span className="font-medium text-foreground ml-2 flex-shrink-0">${formatAmount(cat.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-12">No data available</p>
        )}
      </div>

      {/* Subcategory Breakdown Bar Chart */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Spending by Subcategory (Top 10)</h3>
        {subcategoryData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={Math.max(subcategoryData.length * 50, 300)}>
              <BarChart data={subcategoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={250} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
                <Bar dataKey="value" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>

            {/* Subcategory Summary */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {subcategoryData.slice(0, 5).map((sub) => (
                <div key={sub.name} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {sub.imageUrl && (
                      <Image
                        src={sub.imageUrl}
                        alt={sub.name}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded flex-shrink-0"
                      />
                    )}
                    <span className="text-muted-foreground truncate">{sub.name}</span>
                  </div>
                  <span className="font-medium text-foreground ml-2 flex-shrink-0">${formatAmount(sub.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-12">No data available</p>
        )}
      </div>
    </div>
  )
}
