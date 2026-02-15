import { TransactionDetailView } from "@/components/transactions/detail/TransactionDetailView"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getTransactionById, getAllCategories, getAllTags } from "@/lib/demo/queries"
import type { TransactionForClient } from "@/types"

export async function DemoTransactionDetailAsync({ id }: { id: string }) {
  try {
    const [txResult, categories, tags] = await Promise.all([
      getTransactionById(id),
      getAllCategories(),
      getAllTags(),
    ])

    if (!txResult) {
      return (
        <ErrorFallback
          title="Transaction not found"
          description="This transaction may have been deleted or doesn't exist."
        />
      )
    }

    const transaction = {
      ...(txResult as any),
      amount_number: (txResult as any).amount_number ?? 0,
      tags: (txResult as any).tags.map((tt: any) => tt.tag || tt),
    } as TransactionForClient

    return <TransactionDetailView transaction={transaction} categories={categories as any} tags={tags as any} />
  } catch (error) {
    logError("Failed to load demo transaction detail:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load transaction"
        description="Unable to fetch demo transaction details"
      />
    )
  }
}
