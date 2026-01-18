import type { Metadata } from "next"
import { ManageCategoriesConvex } from "@/components/settings/ManageCategoriesConvex"

export const metadata: Metadata = {
  title: "Manage Categories",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ManageCategoriesPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Categories</h1>
        <p className="text-muted-foreground mt-1">Create and organize your categories and subcategories</p>
      </div>

      <ManageCategoriesConvex />
    </div>
  )
}
