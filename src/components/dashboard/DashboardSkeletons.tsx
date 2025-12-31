import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Skeleton for metric cards (6 cards in 3-column grid)
 */
export function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton for uncategorized banner
 */
export function UncategorizedSectionSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-64" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for transaction table
 */
export function TransactionTableSkeleton({ rows = 20 }: { rows?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex justify-between items-center">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="space-y-2 flex-1 mx-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for chart section (3 charts in grid)
 */
export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton for spending summary section (2 cards side by side)
 */
export function SpendingSummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Facts Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <Skeleton className="h-4 w-4 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Opportunities Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-primary/5 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3 mb-3" />
                <Skeleton className="h-8 w-48 rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Skeleton for section with header and content
 */
export function SectionSkeleton({
  title = true,
  subtitle = true,
  button = false,
  children,
}: {
  title?: boolean
  subtitle?: boolean
  button?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          {title && <Skeleton className="h-7 w-64" />}
          {subtitle && <Skeleton className="h-4 w-48" />}
        </div>
        {button && <Skeleton className="h-10 w-28" />}
      </div>
      {children}
    </div>
  )
}
