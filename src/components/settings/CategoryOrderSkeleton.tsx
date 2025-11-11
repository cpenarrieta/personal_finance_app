import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

/**
 * Skeleton for Category Order page
 * Shows list of categories with up/down buttons and save button
 */
export function CategoryOrderSkeleton() {
  return (
    <div className="space-y-6">
      {/* Save button skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Category type header */}
      <div>
        <Skeleton className="h-8 w-32 mb-4" />
      </div>

      {/* Category list */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              {/* Category number */}
              <Skeleton className="h-6 w-8" />

              {/* Category icon + name */}
              <div className="flex items-center gap-2 flex-1">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-40" />
              </div>

              {/* Up/Down buttons */}
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>

              {/* Dropdown */}
              <Skeleton className="h-10 w-32" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
