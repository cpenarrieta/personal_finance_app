import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for transaction detail page - matches typical TransactionDetailView layout
 */
export function TransactionDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        {/* Colored Header */}
        <div className="bg-primary/20 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              {/* Transaction name */}
              <Skeleton className="h-8 w-96 mb-2" />
              {/* Merchant badge */}
              <Skeleton className="h-6 w-32" />
            </div>

            <div className="text-right">
              {/* Amount */}
              <Skeleton className="h-9 w-28 mb-1" />
              {/* Currency */}
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          </div>
        </div>

        {/* Main Details */}
        <div className="p-6">
          {/* Title and action buttons */}
          <div className="flex justify-between items-start mb-6">
            <Skeleton className="h-7 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Transaction Date */}
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-6 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </div>

              {/* Account */}
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Category */}
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Payment Channel */}
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="pt-6 border-t">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div>
                <Skeleton className="h-3 w-36 mb-1" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div>
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
