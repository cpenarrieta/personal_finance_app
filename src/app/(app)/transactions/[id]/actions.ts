"use server"

import { categorizeTransaction, applyCategorization } from "@/lib/ai/categorize-transaction"
import { prisma } from "@/lib/db/prisma"
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
    // Call the existing categorizeTransaction function with allowRecategorize=true
    // to allow users to get AI suggestions even for already categorized transactions
    const result = await categorizeTransaction(transactionId, { allowRecategorize: true })

    if (!result) {
      return {
        success: false,
        error:
          "Could not generate a categorization suggestion. The transaction may already be categorized or the AI confidence was too low.",
      }
    }

    // Fetch category and subcategory names
    const category = await prisma.category.findUnique({
      where: { id: result.categoryId! },
      select: { name: true },
    })

    const subcategory = result.subcategoryId
      ? await prisma.subcategory.findUnique({
          where: { id: result.subcategoryId },
          select: { name: true },
        })
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
    // Pass true as the 4th argument to skip adding the "for-review" tag
    // since the user is manually confirming this categorization
    await applyCategorization(transactionId, categoryId, subcategoryId, true)

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
