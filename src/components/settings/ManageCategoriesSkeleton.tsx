import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Skeleton for Manage Categories page
 * Shows add category form and existing categories list with subcategories
 */
export function ManageCategoriesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Add New Category Form */}
      <Card className="p-6">
        <Skeleton className="h-7 w-40 mb-4" />

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Transfer category checkbox */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Add button */}
        <Skeleton className="h-10 w-32" />
      </Card>

      {/* Categories List */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              {/* Category header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div>
                    <Skeleton className="h-6 w-40 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-9 w-32" />
              </div>

              {/* Subcategories */}
              <div className="ml-12 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between py-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
