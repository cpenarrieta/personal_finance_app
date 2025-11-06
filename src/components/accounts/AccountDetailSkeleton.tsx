import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function AccountDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg p-4 border">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-56 mt-4" />
      </Card>

      {/* Content */}
      <Skeleton className="h-6 w-32 mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
