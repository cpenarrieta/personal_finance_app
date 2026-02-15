import { Suspense } from "react"
import type { Metadata } from "next"
import { DemoTransactionsPageAsync } from "@/components/demo/DemoTransactionsPageAsync"
import { TransactionsPageSkeleton } from "@/components/transactions/list/TransactionsPageSkeleton"
import { parseTransactionFiltersFromUrl } from "@/lib/transactions/url-params"

export const metadata: Metadata = {
  title: "Demo - Banking Transactions",
  robots: { index: true, follow: false },
}

interface TransactionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DemoTransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams
  const initialFilters = parseTransactionFiltersFromUrl(params)

  return (
    <Suspense fallback={<TransactionsPageSkeleton />}>
      <DemoTransactionsPageAsync initialFilters={initialFilters} />
    </Suspense>
  )
}
