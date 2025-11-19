"use server"

/**
 * Server Actions for receipt analysis and smart splitting
 */

import { analyzeReceiptForSplits, applySplitSuggestions } from "@/lib/ai/analyze-receipt"
import { revalidateTag } from "next/cache"
import type { ReceiptAnalysisResult } from "@/lib/ai/analyze-receipt"

/**
 * Server action to analyze receipt and get split suggestions
 */
export async function analyzeReceiptAction(transactionId: string): Promise<{
  success: boolean
  data?: ReceiptAnalysisResult
  error?: string
}> {
  try {
    const result = await analyzeReceiptForSplits(transactionId)

    if (!result) {
      return {
        success: false,
        error: "No splits suggested - receipt may not need splitting or could not be analyzed",
      }
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error in analyzeReceiptAction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze receipt",
    }
  }
}

/**
 * Server action to apply split suggestions and create child transactions
 */
export async function applySplitsAction(
  transactionId: string,
  splits: Array<{
    categoryName: string
    subcategoryName: string | null
    amount: number
    itemsSummary: string
  }>,
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await applySplitSuggestions(transactionId, splits)

    // Revalidate transactions cache
    revalidateTag("transactions")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error in applySplitsAction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply splits",
    }
  }
}
