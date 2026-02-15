import { Suspense } from "react"
import type { Metadata } from "next"
import { DemoManageCategoriesAsync } from "@/components/demo/DemoManageCategoriesAsync"
import { ManageCategoriesSkeleton } from "@/components/settings/ManageCategoriesSkeleton"

export const metadata: Metadata = {
  title: "Demo - Manage Categories",
  robots: { index: true, follow: false },
}

export default function DemoManageCategoriesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Categories</h1>
        <p className="text-muted-foreground mt-1">View your categories and subcategories</p>
      </div>

      <Suspense fallback={<ManageCategoriesSkeleton />}>
        <DemoManageCategoriesAsync />
      </Suspense>
    </div>
  )
}
