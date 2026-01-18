import type { Metadata } from "next"
import { ManageTagsConvex } from "@/components/settings/ManageTagsConvex"

export const metadata: Metadata = {
  title: "Manage Tags",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ManageTagsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Manage Tags</h1>
        <p className="text-muted-foreground mt-1">Create and organize tags to categorize your transactions</p>
      </div>

      <ManageTagsConvex />
    </div>
  )
}
