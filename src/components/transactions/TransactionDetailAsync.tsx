import { TransactionDetailView } from "@/components/TransactionDetailView";
import { getTransactionById } from "@/lib/cached-queries-transaction";
import { getAllCategories, getAllTags } from "@/lib/cached-queries";
import { ErrorFallback } from "@/components/ErrorFallback";
import type { TransactionForClient } from "@/types";

/**
 * Async Server Component for Transaction Detail
 * Fetches transaction with categories and tags using cached queries
 */
export async function TransactionDetailAsync({ id }: { id: string }) {
  try {
    const [txResult, categories, tags] = await Promise.all([
      getTransactionById(id),
      getAllCategories(),
      getAllTags(),
    ]);

    if (!txResult) {
      return (
        <ErrorFallback
          title="Transaction not found"
          description="This transaction may have been deleted or doesn't exist."
        />
      );
    }

    // Flatten tags structure
    const transaction: TransactionForClient = {
      ...txResult,
      tags: txResult.tags.map((tt: typeof txResult.tags[0]) => tt.tag),
    };

    return (
      <TransactionDetailView
        transaction={transaction}
        categories={categories}
        tags={tags}
      />
    );
  } catch (error) {
    console.error("Failed to load transaction detail:", error);
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load transaction"
        description="Unable to fetch transaction details"
      />
    );
  }
}
