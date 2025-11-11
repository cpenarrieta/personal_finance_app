import { Suspense } from "react"
import { getTransactionById } from "@/lib/db/queries-transactions"
import { TransactionDetailAsync } from "@/components/transactions/detail/TransactionDetailAsync"
import { TransactionDetailSkeleton } from "@/components/transactions/detail/TransactionDetailSkeleton"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const transaction = await getTransactionById(id)

  if (!transaction) {
    return {
      title: "Transaction Not Found",
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: `Transaction | ${transaction.name}`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<TransactionDetailSkeleton />}>
      <TransactionDetailAsync id={id} />
    </Suspense>
  )
}
