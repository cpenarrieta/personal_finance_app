import { HoldingsPortfolioSkeleton } from "@/components/investments/HoldingsPortfolioSkeleton";

export default function Loading() {
  return (
    <div className="overflow-hidden">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Investment Holdings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your portfolio performance and allocation
        </p>
      </div>
      <HoldingsPortfolioSkeleton />
    </div>
  );
}
