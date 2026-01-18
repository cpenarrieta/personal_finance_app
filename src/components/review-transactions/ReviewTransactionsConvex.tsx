"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { ReviewTransactionsClient } from "./ReviewTransactionsClient"
import type { TransactionForClient, CategoryForClient, TagForClient } from "@/types"

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

/**
 * Convex wrapper for ReviewTransactionsClient
 * Fetches review transactions, categories, and tags via Convex queries
 */
export function ReviewTransactionsConvex() {
  const transactions = useQuery(api.transactions.getReviewTransactions)
  const categories = useQuery(api.categories.getAll)
  const tags = useQuery(api.tags.getAll)

  if (transactions === undefined || categories === undefined || tags === undefined) {
    return <ReviewTransactionsSkeleton />
  }

  // Transform to expected client types
  const transformedTransactions: TransactionForClient[] = transactions.map((t) => ({
    ...t,
    amount_number: t.amount_number ?? 0,
  })) as TransactionForClient[]

  const transformedCategories: CategoryForClient[] = categories as CategoryForClient[]
  const transformedTags: TagForClient[] = tags as TagForClient[]

  return (
    <ReviewTransactionsClient
      transactions={transformedTransactions}
      categories={transformedCategories}
      tags={transformedTags}
    />
  )
}
