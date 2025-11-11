import { Suspense } from "react"
import type { Metadata } from "next"
import { ManageTagsAsync } from "@/components/settings/ManageTagsAsync"
import { ManageTagsSkeleton } from "@/components/settings/ManageTagsSkeleton"

export const metadata: Metadata = {
  title: "Manage Tags",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ManageTagsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Manage Tags</h1>
        <p className="text-muted-foreground mt-1">Create and organize tags to categorize your transactions</p>
      </div>

      <Suspense fallback={<ManageTagsSkeleton />}>
        <ManageTagsAsync />
      </Suspense>
    </div>
  )
}
