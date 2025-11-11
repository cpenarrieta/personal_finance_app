import { Skeleton } from "@/components/ui/skeleton"

/**
 * Route-level loading state for dashboard and other pages in the (app) route group
 * Shown during initial page navigation
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Generic page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Content area skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
