import { Suspense } from "react"
import { StockDetailAsync } from "@/components/investments/holdings/StockDetailAsync"
import { StockDetailSkeleton } from "@/components/investments/holdings/StockDetailSkeleton"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ ticker: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params
  return {
    title: `${ticker} - Holdings`,
    robots: { index: false, follow: false },
  }
}

export default async function StockDetailPage({ params }: Props) {
  const { ticker } = await params

  return (
    <Suspense fallback={<StockDetailSkeleton />}>
      <StockDetailAsync ticker={ticker} />
    </Suspense>
  )
}
