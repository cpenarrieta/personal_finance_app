import { Suspense } from "react"
import type { Metadata } from "next"
import { DemoManageTagsAsync } from "@/components/demo/DemoManageTagsAsync"
import { ManageTagsSkeleton } from "@/components/settings/ManageTagsSkeleton"

export const metadata: Metadata = {
  title: "Demo - Manage Tags",
  robots: { index: true, follow: false },
}

export default function DemoManageTagsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Manage Tags</h1>
        <p className="text-muted-foreground mt-1">View your tags for categorizing transactions</p>
      </div>

      <Suspense fallback={<ManageTagsSkeleton />}>
        <DemoManageTagsAsync />
      </Suspense>
    </div>
  )
}
