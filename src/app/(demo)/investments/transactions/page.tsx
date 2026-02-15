import { Suspense } from "react"
import type { Metadata } from "next"
import { DemoInvestmentTransactionsAsync } from "@/components/demo/DemoInvestmentTransactionsAsync"
import { InvestmentTransactionsSkeleton } from "@/components/investments/holdings/HoldingsPortfolioSkeleton"

export const metadata: Metadata = {
  title: "Demo - Investment Transactions",
  robots: { index: true, follow: false },
}

export default function DemoInvTxPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Investment Transactions</h1>
      </div>
      <Suspense fallback={<InvestmentTransactionsSkeleton />}>
        <DemoInvestmentTransactionsAsync />
      </Suspense>
    </div>
  )
}
