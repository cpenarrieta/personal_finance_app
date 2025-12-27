import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  uncategorizedCount?: number
  href?: string
  valueClassName?: string
  trend?: {
    value: number
    label?: string
  }
  accentColor?: "default" | "success" | "warning" | "destructive"
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  uncategorizedCount,
  href,
  valueClassName,
  trend,
  accentColor = "default",
}: MetricCardProps) {
  const iconBgClasses = {
    default: "bg-muted text-muted-foreground",
    success: "bg-muted text-muted-foreground",
    warning: "bg-muted text-muted-foreground",
    destructive: "bg-muted text-muted-foreground",
  }

  const content = (
    <>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </div>
        {Icon && (
          <div className={`rounded-lg p-2 ${iconBgClasses[accentColor]}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`text-2xl md:text-3xl font-bold tracking-tight ${valueClassName || ""}`}>{value}</div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            {uncategorizedCount !== undefined && uncategorizedCount > 0 && (
              <p className="text-xs mt-1 text-destructive font-medium">{uncategorizedCount} uncategorized</p>
            )}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                trend.value >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {href && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View details</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="group">
        <Card className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200">
          {content}
        </Card>
      </Link>
    )
  }

  return <Card>{content}</Card>
}
