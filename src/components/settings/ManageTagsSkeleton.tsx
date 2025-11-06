import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Skeleton for Manage Tags page
 * Shows add tag form and existing tags list
 */
export function ManageTagsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Add New Tag Form */}
      <Card className="p-6">
        <Skeleton className="h-7 w-32 mb-4" />

        {/* Tag Name */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Tag Color */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))}
          </div>
        </div>

        {/* Custom color */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Add button */}
        <Skeleton className="h-12 w-full" />
      </Card>

      {/* Existing Tags */}
      <div>
        <Skeleton className="h-7 w-32 mb-4" />

        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                {/* Tag badge + count */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28" />
                </div>

                {/* Tag name + color + buttons */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
