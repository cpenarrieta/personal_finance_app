"use server"

import { categorizeTransaction, applyCategorization } from "@/lib/ai/categorize-transaction"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { revalidateTag, revalidatePath } from "next/cache"
import { z } from "zod"
import { logError } from "@/lib/utils/logger"

const AICategorizeResponseSchema = z.object({
  categoryId: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  subcategoryName: z.string().nullable(),
  confidence: z.number(),
  reasoning: z.string(),
})

export type AICategorizeResponse = z.infer<typeof AICategorizeResponseSchema>

/**
 * Get AI categorization suggestion for a transaction (without applying it)
 */
export async function getAICategorization(transactionId: string): Promise<{
  success: boolean
  data?: AICategorizeResponse
  error?: string
}> {
  try {
    // Cast to Convex Id type
    const convexTransactionId = transactionId as Id<"transactions">

    // Call the existing categorizeTransaction function with allowRecategorize=true
    // to allow users to get AI suggestions even for already categorized transactions
    const result = await categorizeTransaction(convexTransactionId, { allowRecategorize: true })

    if (!result) {
      return {
        success: false,
        error:
          "Could not generate a categorization suggestion. The transaction may already be categorized or the AI confidence was too low.",
      }
    }

    // Fetch category and subcategory names from Convex
    const category = result.categoryId
      ? await fetchQuery(api.categories.getById, { id: result.categoryId as Id<"categories"> })
      : null

    const subcategory = result.subcategoryId
      ? await fetchQuery(api.categories.getSubcategoryById, { id: result.subcategoryId as Id<"subcategories"> })
      : null

    return {
      success: true,
      data: {
        categoryId: result.categoryId,
        subcategoryId: result.subcategoryId,
        categoryName: category?.name || null,
        subcategoryName: subcategory?.name || null,
        confidence: result.confidence,
        reasoning: result.reasoning,
      },
    }
  } catch (error) {
    logError("Error getting AI categorization:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get AI categorization",
    }
  }
}

/**
 * Apply AI categorization to a transaction and add "for-review" tag
 */
export async function applyAICategorization(
  transactionId: string,
  categoryId: string,
  subcategoryId: string | null,
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Cast to Convex Id types
    const convexTransactionId = transactionId as Id<"transactions">
    const convexCategoryId = categoryId as Id<"categories">
    const convexSubcategoryId = subcategoryId ? (subcategoryId as Id<"subcategories">) : null

    // Pass true as the 4th argument to skip adding the "for-review" tag
    // since the user is manually confirming this categorization
    await applyCategorization(convexTransactionId, convexCategoryId, convexSubcategoryId, true)

    // Revalidate caches
    revalidateTag("transactions", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache for all routes

    return {
      success: true,
    }
  } catch (error) {
    logError("Error applying AI categorization:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply AI categorization",
    }
  }
}
