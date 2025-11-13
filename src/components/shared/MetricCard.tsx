import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  uncategorizedCount?: number
  href?: string
  valueClassName?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  uncategorizedCount,
  href,
  valueClassName,
}: MetricCardProps) {
  const content = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ""}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {uncategorizedCount !== undefined && uncategorizedCount > 0 && (
          <p className="text-xs mt-1 text-destructive">{uncategorizedCount} uncategorized</p>
        )}
      </CardContent>
    </>
  )

  if (href) {
    return (
      <Link href={href}>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">{content}</Card>
      </Link>
    )
  }

  return <Card>{content}</Card>
}
