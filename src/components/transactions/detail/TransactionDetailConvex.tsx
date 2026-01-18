"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { TransactionDetailView } from "./TransactionDetailView"
import { TransactionDetailSkeleton } from "./TransactionDetailSkeleton"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import type { TransactionForClient, CategoryForClient, TagForClient } from "@/types"

interface TransactionDetailConvexProps {
  id: string
}

/**
 * Convex wrapper for TransactionDetailView
 * Fetches transaction, categories, and tags via Convex queries
 */
export function TransactionDetailConvex({ id }: TransactionDetailConvexProps) {
  // Cast string to Convex ID type
  const transactionId = id as Id<"transactions">

  const transaction = useQuery(api.transactions.getById, { id: transactionId })
  const categories = useQuery(api.categories.getAll)
  const tags = useQuery(api.tags.getAll)

  // Loading state
  if (transaction === undefined || categories === undefined || tags === undefined) {
    return <TransactionDetailSkeleton />
  }

  // Not found
  if (transaction === null) {
    return (
      <ErrorFallback
        title="Transaction not found"
        description="This transaction may have been deleted or doesn't exist."
      />
    )
  }

  // Transform to expected client types
  const transformedTransaction: TransactionForClient = {
    ...transaction,
    amount_number: transaction.amount_number ?? 0,
  } as TransactionForClient

  const transformedCategories: CategoryForClient[] = categories as CategoryForClient[]
  const transformedTags: TagForClient[] = tags as TagForClient[]

  return (
    <TransactionDetailView
      transaction={transformedTransaction}
      categories={transformedCategories}
      tags={transformedTags}
    />
  )
}
