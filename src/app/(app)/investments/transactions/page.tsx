import { Suspense } from "react";
import { InvestmentTransactionsAsync } from "@/components/investments/InvestmentTransactionsAsync";
import { InvestmentTransactionsSkeleton } from "@/components/investments/HoldingsPortfolioSkeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Transactions",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InvTxPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Investment Transactions</h1>
      </div>
      <Suspense fallback={<InvestmentTransactionsSkeleton />}>
        <InvestmentTransactionsAsync />
      </Suspense>
    </div>
  );
}
