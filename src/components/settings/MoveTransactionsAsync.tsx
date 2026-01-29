import { connection } from "next/server"
import { MoveTransactionsClient } from "@/components/settings/MoveTransactionsClient"
import { getAllCategoriesForMoveTransactions } from "@/lib/db/queries"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import type { CategoryForClient } from "@/types"
import { logError } from "@/lib/utils/logger"

export async function MoveTransactionsAsync() {
  // Defer to request time - requires auth and user-specific data
  await connection()

  try {
    const categories = (await getAllCategoriesForMoveTransactions()) as CategoryForClient[]

    return <MoveTransactionsClient categories={categories} />
  } catch (error) {
    logError("Failed to load categories for move transactions:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load categories"
        description="Unable to fetch category data for moving transactions"
      />
    )
  }
}
