import { Suspense } from "react"
import { TransactionDetailAsync } from "@/components/transactions/detail/TransactionDetailAsync"
import { TransactionDetailSkeleton } from "@/components/transactions/detail/TransactionDetailSkeleton"

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<TransactionDetailSkeleton />}>
      <TransactionDetailAsync id={id} />
    </Suspense>
  )
}
