import { TransactionsPageSkeleton } from "@/components/transactions/list/TransactionsPageSkeleton";

/**
 * Route-level loading state for transactions page
 * Shown during initial page navigation
 */
export default function Loading() {
  return <TransactionsPageSkeleton />;
}
