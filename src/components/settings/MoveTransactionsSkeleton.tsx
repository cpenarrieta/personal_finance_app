import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Skeleton for Move Transactions page
 * Shows step card with form elements
 */
export function MoveTransactionsSkeleton() {
  return (
    <Card className="p-6">
      {/* Step title */}
      <Skeleton className="h-7 w-64 mb-4" />

      {/* From Category label */}
      <Skeleton className="h-5 w-32 mb-2" />

      {/* Category dropdown */}
      <Skeleton className="h-10 w-full" />
    </Card>
  );
}
