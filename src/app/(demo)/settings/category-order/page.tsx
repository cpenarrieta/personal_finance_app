import { Suspense } from "react"
import type { Metadata } from "next"
import { DemoCategoryOrderAsync } from "@/components/demo/DemoCategoryOrderAsync"
import { CategoryOrderSkeleton } from "@/components/settings/CategoryOrderSkeleton"

export const metadata: Metadata = {
  title: "Demo - Category Order",
  robots: { index: true, follow: false },
}

export default function DemoCategoryOrderPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Category Order</h1>
        <p className="text-muted-foreground mt-1">View how categories appear in dropdown lists</p>
      </div>

      <Suspense fallback={<CategoryOrderSkeleton />}>
        <DemoCategoryOrderAsync />
      </Suspense>
    </div>
  )
}
