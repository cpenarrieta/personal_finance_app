import { MoveTransactionsClient } from "@/components/settings/MoveTransactionsClient";
import { getAllCategoriesForMoveTransactions } from "@/lib/db/queries-settings";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
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
