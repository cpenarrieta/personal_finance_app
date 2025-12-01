"use server"

import { smartAnalyzeReceipt, type SmartAnalysisResult } from "@/lib/ai/smart-analyze-receipt"
import { logError } from "@/lib/utils/logger"

/**
 * Server action to smart analyze receipt files
 * Determines whether to split, recategorize, or confirm current category
 */
export async function smartAnalyzeReceiptAction(transactionId: string): Promise<SmartAnalysisResult | null> {
  try {
    const result = await smartAnalyzeReceipt(transactionId)
    return result
  } catch (error) {
    logError("Error in smartAnalyzeReceiptAction:", error)
    return null
  }
}
