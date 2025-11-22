import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function LiabilitiesListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Credit Cards Skeleton */}
      <div>
        <div className="h-7 w-32 bg-muted rounded mb-3 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-32 bg-muted rounded animate-pulse mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse mt-1" />
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Mortgages Skeleton */}
      <div>
        <div className="h-7 w-28 bg-muted rounded mb-3 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-36 bg-muted rounded animate-pulse mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-24 bg-muted rounded animate-pulse mt-1" />
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Student Loans Skeleton */}
      <div>
        <div className="h-7 w-36 bg-muted rounded mb-3 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-32 bg-muted rounded animate-pulse mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse mt-1" />
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
