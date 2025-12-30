"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts"
import type { SankeyData } from "@/lib/dashboard/calculations"

interface CashflowSankeyChartProps {
  data: SankeyData
  title?: string
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomNode(props: any) {
  const { x, y, width, height, payload } = props
  const isCashFlow = payload.name === "Cash Flow"

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || "#94a3b8"}
        fillOpacity={1}
        radius={2}
      />
      <text
        x={isCashFlow ? x + width / 2 : x < 200 ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isCashFlow ? "middle" : x < 200 ? "end" : "start"}
        dominantBaseline="middle"
        fill="var(--foreground)"
        fontSize={12}
        fontWeight={isCashFlow ? 600 : 400}
      >
        {payload.name}
      </text>
      {payload.value && (
        <text
          x={isCashFlow ? x + width / 2 : x < 200 ? x - 8 : x + width + 8}
          y={y + height / 2 + 14}
          textAnchor={isCashFlow ? "middle" : x < 200 ? "end" : "start"}
          dominantBaseline="middle"
          fill="var(--muted-foreground)"
          fontSize={11}
        >
          {formatCurrency(payload.value)}
        </text>
      )}
    </Layer>
  )
}

function CustomLink(props: any) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props

  return (
    <Layer>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={payload.color || "#94a3b8"}
        strokeWidth={linkWidth}
        strokeOpacity={0.3}
      />
    </Layer>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function CashflowSankeyChart({ data, title = "Cashflow" }: CashflowSankeyChartProps) {
  const hasData = data.nodes.length > 0 && data.links.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No cashflow data available</p>
        </CardContent>
      </Card>
    )
  }

  const sankeyData = {
    nodes: data.nodes.map((node) => ({
      name: node.name,
      color: node.color,
    })),
    links: data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
      color: link.color,
    })),
  }

  return (
    <Card className="col-span-full hidden md:block">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="text-sm text-muted-foreground">
          Income: {formatCurrency(data.totalIncome)} | Expenses: {formatCurrency(data.totalExpenses)}
          {data.surplus > 0 ? ` | Surplus: ${formatCurrency(data.surplus)}` : ""}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <Sankey
            data={sankeyData}
            nodeWidth={10}
            nodePadding={24}
            margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
            link={<CustomLink />}
            node={<CustomNode />}
            sort={false}
          >
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null
                const item = payload[0]?.payload
                if (!item) return null

                return (
                  <div className="bg-background border border-border rounded-md px-3 py-2 shadow-md">
                    <p className="font-medium">{item.name || `${item.source?.name} → ${item.target?.name}`}</p>
                    <p className="text-muted-foreground text-sm">{formatCurrency(item.value)}</p>
                  </div>
                )
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
