"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { ChevronDown, ChevronUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface MonthlyPenalty {
  year: number
  month: number
  excessAmount: number
  penalty: number
}

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function PenaltyTable({ penalties }: { penalties: MonthlyPenalty[] }) {
  const [expanded, setExpanded] = useState(false)

  if (!penalties || penalties.length === 0) return null

  const totalPenalty = penalties.reduce((sum, p) => sum + p.penalty, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-destructive">Penalties ({formatCurrency(totalPenalty)} total)</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Excess</TableHead>
                <TableHead className="text-right">Penalty (1%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penalties.map((p) => (
                <TableRow key={`${p.year}-${p.month}`}>
                  <TableCell>
                    {MONTH_NAMES[p.month]} {p.year}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(p.excessAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.penalty)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell />
                <TableCell className="text-right font-medium">{formatCurrency(totalPenalty)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      )}
    </Card>
  )
}
