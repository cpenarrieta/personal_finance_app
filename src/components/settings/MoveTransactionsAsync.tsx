import { MoveTransactionsClient } from "@/components/MoveTransactionsClient";
import { getAllCategoriesForMoveTransactions } from "@/lib/cached-queries-settings";
import { ErrorFallback } from "@/components/ErrorFallback";
import type { CategoryForClient } from "@/types";

export async function MoveTransactionsAsync() {
  try {
    const categories = (await getAllCategoriesForMoveTransactions()) as CategoryForClient[];

    return <MoveTransactionsClient categories={categories} />;
  } catch (error) {
    console.error("Failed to load categories for move transactions:", error);
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load categories"
        description="Unable to fetch category data for moving transactions"
      />
    );
  }
}
