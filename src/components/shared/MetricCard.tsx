import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MetricCardProps } from "@/types"

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  valueClassName,
}: MetricCardProps) {
  const content = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ""}`}>{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <p
            className={`text-xs mt-1 ${
              trend.positive ? "text-success" : "text-destructive"
            }`}
          >
            {trend.positive ? "+" : ""}
            {trend.value}% {trend.label}
          </p>
        )}
      </CardContent>
    </>
  )

  if (href) {
    return (
      <Link href={href}>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          {content}
        </Card>
      </Link>
    )
  }

  return <Card>{content}</Card>
}
