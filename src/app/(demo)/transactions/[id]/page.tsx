import { Suspense } from "react"
import { DemoTransactionDetailAsync } from "@/components/demo/DemoTransactionDetailAsync"
import { TransactionDetailSkeleton } from "@/components/transactions/detail/TransactionDetailSkeleton"

export default async function DemoTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<TransactionDetailSkeleton />}>
      <DemoTransactionDetailAsync id={id} />
    </Suspense>
  )
}
