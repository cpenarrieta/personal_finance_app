"use client"

import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface RoomProgressBarProps {
  used: number
  total: number
  label?: string
}

export function RoomProgressBar({ used, total, label }: RoomProgressBarProps) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const colorClass = pct > 100 ? "[&>div]:bg-destructive" : pct >= 90 ? "[&>div]:bg-chart-4" : ""

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <Progress value={pct} className={cn("h-2", colorClass)} />
      <p className="text-xs text-muted-foreground">
        {formatCurrency(used)} / {formatCurrency(total)} ({Math.round(pct)}%)
      </p>
    </div>
  )
}
