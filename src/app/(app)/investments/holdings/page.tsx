import { Suspense } from "react"
import { syncStockPrices } from "@/lib/sync/sync-prices"
import { syncHoldingsLogos } from "@/lib/sync/sync-holdings-logos"
import { revalidatePath, revalidateTag } from "next/cache"
import { SyncPricesButton } from "@/components/sync/SyncPricesButton"
import { SyncHoldingsLogosButton } from "@/components/sync/SyncHoldingsLogosButton"
import { HoldingsPortfolioAsync } from "@/components/investments/holdings/HoldingsPortfolioAsync"
import { HoldingsPortfolioSkeleton } from "@/components/investments/holdings/HoldingsPortfolioSkeleton"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Investment Holdings",
  robots: {
    index: false,
    follow: false,
  },
}

async function doSyncPrices() {
  "use server"
  await syncStockPrices()
  revalidatePath("/investments/holdings")
  revalidateTag("holdings", "max")
  revalidateTag("dashboard", "max")
}

async function doSyncHoldingsLogos() {
  "use server"
  await syncHoldingsLogos()
  revalidatePath("/investments/holdings")
  revalidateTag("holdings", "max")
}

export default function HoldingsPage() {
  return (
    <div className="overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investment Holdings</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your portfolio performance and allocation</p>
        </div>
        <div className="flex gap-2">
          <SyncPricesButton action={doSyncPrices} />
          <SyncHoldingsLogosButton action={doSyncHoldingsLogos} />
        </div>
      </div>

      <Suspense fallback={<HoldingsPortfolioSkeleton />}>
        <HoldingsPortfolioAsync />
      </Suspense>
    </div>
  )
}
