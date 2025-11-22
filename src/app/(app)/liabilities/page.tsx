import { Suspense } from "react"
import type { Metadata } from "next"
import { LiabilitiesListAsync } from "@/components/liabilities/LiabilitiesListAsync"
import { LiabilitiesListSkeleton } from "@/components/liabilities/LiabilitiesListSkeleton"

export const metadata: Metadata = {
  title: "Liabilities",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function LiabilitiesPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Liabilities</h2>
      <Suspense fallback={<LiabilitiesListSkeleton />}>
        <LiabilitiesListAsync />
      </Suspense>
    </>
  )
}
