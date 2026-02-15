import { TransactionsPageClient } from "@/components/transactions/list/TransactionsPageClient"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import {
  getAllTransactions,
  getAllCategories,
  getAllTags,
  getAllAccounts,
} from "@/lib/demo/queries"
import type { TransactionForClient, CategoryForClient, TagForClient, PlaidAccountForClient } from "@/types"
import type { TransactionFiltersFromUrl } from "@/lib/transactions/url-params"

interface DemoTransactionsPageAsyncProps {
  initialFilters?: TransactionFiltersFromUrl
}

export async function DemoTransactionsPageAsync({ initialFilters }: DemoTransactionsPageAsyncProps) {
  try {
    const [transactions, categories, tags, accounts] = await Promise.all([
      getAllTransactions(),
      getAllCategories(),
      getAllTags(),
      getAllAccounts(),
    ])

    const transformedTransactions: TransactionForClient[] = (transactions as any[]).map((t) => ({
      ...t,
      amount_number: t.amount_number ?? 0,
    })) as TransactionForClient[]

    return (
      <TransactionsPageClient
        transactions={transformedTransactions}
        categories={categories as CategoryForClient[]}
        tags={tags as TagForClient[]}
        accounts={accounts as PlaidAccountForClient[]}
        initialFilters={initialFilters}
      />
    )
  } catch (error) {
    logError("Failed to load demo transactions page:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load transactions"
        description="Unable to fetch demo transaction data"
      />
    )
  }
}
