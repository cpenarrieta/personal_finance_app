import { ReviewTransactionsClient } from "@/components/review-transactions/ReviewTransactionsClient"
import type { Metadata } from "next"
import { Suspense } from "react"
import { getReviewTransactions, getAllCategories, getAllTags } from "@/lib/db/queries"

export const metadata: Metadata = {
  title: "Review Transactions",
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Async component that fetches review transaction data
 */
async function ReviewTransactionsData() {
  // Use cached queries for all data fetching
  const [transactions, categories, tags] = await Promise.all([
    getReviewTransactions(),
    getAllCategories(),
    getAllTags(),
  ] as const)

  // Flatten tags structure (tags.tag → tags)
  const transactionsWithFlatTags = transactions.map((t: (typeof transactions)[0]) => ({
    ...t,
    tags: t.tags.map((tt: (typeof t.tags)[0]) => tt.tag),
  }))

  return (
    <ReviewTransactionsClient
      transactions={transactionsWithFlatTags}
      categories={categories}
      tags={tags}
    />
  )
}

/**
 * Loading skeleton for the review transactions page
 */
function ReviewTransactionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  )
}

export default async function ReviewTransactionsPage() {
  return (
    <Suspense fallback={<ReviewTransactionsSkeleton />}>
      <ReviewTransactionsData />
    </Suspense>
  )
}
