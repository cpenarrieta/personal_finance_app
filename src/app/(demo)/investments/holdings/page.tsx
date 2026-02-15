import { Suspense } from "react"
import { DemoHoldingsPortfolioAsync } from "@/components/demo/DemoHoldingsPortfolioAsync"
import { HoldingsPortfolioSkeleton } from "@/components/investments/holdings/HoldingsPortfolioSkeleton"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Demo - Investment Holdings",
  robots: { index: true, follow: false },
}

export default function DemoHoldingsPage() {
  return (
    <div className="overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investment Holdings</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your portfolio performance and allocation</p>
        </div>
      </div>

      <Suspense fallback={<HoldingsPortfolioSkeleton />}>
        <DemoHoldingsPortfolioAsync />
      </Suspense>
    </div>
  )
}
