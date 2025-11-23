"use server"

import { smartAnalyzeReceipt, type SmartAnalysisResult } from "@/lib/ai/smart-analyze-receipt"

/**
 * Server action to smart analyze receipt files
 * Determines whether to split, recategorize, or confirm current category
 */
export async function smartAnalyzeReceiptAction(transactionId: string): Promise<SmartAnalysisResult | null> {
  try {
    const result = await smartAnalyzeReceipt(transactionId)
    return result
  } catch (error) {
    console.error("Error in smartAnalyzeReceiptAction:", error)
    return null
  }
}
