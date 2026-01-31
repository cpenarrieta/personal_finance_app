import { Skeleton } from "@/components/ui/skeleton"

export default function SecurityLoadingPage() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
