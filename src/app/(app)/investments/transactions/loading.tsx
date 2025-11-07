import { InvestmentTransactionsSkeleton } from "@/components/investments/holdings/HoldingsPortfolioSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Investment Transactions</h1>
      </div>
      <InvestmentTransactionsSkeleton />
    </div>
  );
}
