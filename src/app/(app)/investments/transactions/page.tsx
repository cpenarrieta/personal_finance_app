import { InvestmentTransactionsConvex } from "@/components/investments/transactions/InvestmentTransactionsConvex"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Investment Transactions",
  robots: {
    index: false,
    follow: false,
  },
}

export default function InvTxPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Investment Transactions</h1>
      </div>
      <InvestmentTransactionsConvex />
    </div>
  )
}
