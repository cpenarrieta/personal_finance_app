import type { Metadata } from "next"
import { CategoryOrderConvex } from "@/components/settings/CategoryOrderConvex"

export const metadata: Metadata = {
  title: "Manage Category Order",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CategoryOrderPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Category Order</h1>
        <p className="text-muted-foreground mt-1">Organize how categories appear in dropdown lists</p>
      </div>

      <CategoryOrderConvex />
    </div>
  )
}
