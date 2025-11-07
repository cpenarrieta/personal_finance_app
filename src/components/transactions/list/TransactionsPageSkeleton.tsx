import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Skeleton loader for Transactions Page
 * Matches the exact layout of the real page for seamless UX
 */
export function TransactionsPageSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          {/* Filters Section */}
          <Card className="p-4 mb-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </Card>

          {/* Transaction List */}
          <div className="space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-2 flex-1 mx-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
