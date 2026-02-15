import { Suspense } from "react"
import { DemoStockDetailAsync } from "@/components/demo/DemoStockDetailAsync"
import { StockDetailSkeleton } from "@/components/investments/holdings/StockDetailSkeleton"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ ticker: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params
  return {
    title: `Demo - ${ticker} - Holdings`,
    robots: { index: true, follow: false },
  }
}

export default async function DemoStockDetailPage({ params }: Props) {
  const { ticker } = await params

  return (
    <Suspense fallback={<StockDetailSkeleton />}>
      <DemoStockDetailAsync ticker={ticker} />
    </Suspense>
  )
}
