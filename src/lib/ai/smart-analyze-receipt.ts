/**
 * AI-powered smart receipt analysis using OpenAI vision via ai-sdk
 * Analyzes receipts to determine if transaction should be split or recategorized
 * Updated to use Convex instead of Prisma
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { z } from "zod"
import {
  buildCategoriesContext,
  buildHistoryContext,
  buildSimilarTransactionsContext,
  getSimilarTransactions,
  getRecentTransactionHistory as getCategorizeTransactionHistory,
} from "./categorize-transaction"
import { logInfo, logWarn, logError } from "@/lib/utils/logger"

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for a single suggested split
const SuggestedSplitSchema = z.object({
  categoryId: z.string().describe("The exact category ID from the available categories list"),
  subcategoryId: z.string().nullable().describe("The exact subcategory ID, or null if no specific subcategory applies"),
  amount: z.number().positive().describe("The total amount for this category group (must be positive)"),
  description: z.string().describe("Brief description of items in this group (e.g., 'Apples, Bread, Milk')"),
  reasoning: z.string().describe("Brief explanation for why items were grouped into this category"),
})

// Union schema for different analysis result types (wrapped in object for OpenAI API)
const SmartAnalysisResultSchema = z.object({
  result: z.discriminatedUnion("type", [
    // Type 1: Split transaction into multiple categories (requires 2+ splits)
    z.object({
      type: z.literal("split"),
      splits: z
        .array(SuggestedSplitSchema)
        .min(2)
        .describe("Array of suggested splits, grouped by category (minimum 2)"),
      confidence: z.number().min(0).max(100).describe("Overall confidence in the analysis (0-100)"),
      notes: z.string().optional().describe("Any additional notes or warnings about the analysis"),
    }),
    // Type 2: Recategorize entire transaction to a better category
    z.object({
      type: z.literal("recategorize"),
      categoryId: z.string().describe("The suggested category ID"),
      subcategoryId: z.string().nullable().describe("The suggested subcategory ID, or null"),
      confidence: z.number().min(0).max(100).describe("Confidence in this categorization (0-100)"),
      reasoning: z.string().describe("Explanation for why this category is better than the current one"),
    }),
    // Type 3: Confirm current category is correct
    z.object({
      type: z.literal("confirm"),
      confidence: z.number().min(0).max(100).describe("Confidence that current category is correct (0-100)"),
      message: z.string().describe("Confirmation message"),
    }),
  ]),
})

// Type for categories with subcategories
interface CategoryWithSubs {
  id: Id<"categories">
  name: string
  imageUrl: string | null
  groupType: string | null
  displayOrder: number | null
  subcategories: Array<{
    id: Id<"subcategories">
    categoryId: Id<"categories">
    name: string
    imageUrl: string | null
  }>
}

export type SuggestedSplit = z.infer<typeof SuggestedSplitSchema>
export type SmartAnalysisResult = z.infer<typeof SmartAnalysisResultSchema>["result"]

/**
 * Fetch all categories for context (using Convex)
 */
async function getAllCategories(): Promise<CategoryWithSubs[]> {
  const categories = await fetchQuery(api.categories.getAll)
  return categories as CategoryWithSubs[]
}

/**
 * Smart analyze receipt images/PDFs to determine optimal action
 * @param transactionId - The transaction ID to analyze
 * @returns Analysis result with recommended action (split, recategorize, or confirm)
 */
export async function smartAnalyzeReceipt(transactionId: string): Promise<SmartAnalysisResult | null> {
  try {
    // Cast to Convex Id type
    const convexTransactionId = transactionId as Id<"transactions">

    // Fetch the transaction from Convex
    const transaction = await fetchQuery(api.sync.getTransactionForSmartAnalysis, {
      id: convexTransactionId,
    })

    if (!transaction) {
      logError(`Transaction ${transactionId} not found`, undefined, { transactionId })
      return null
    }

    const hasFiles = transaction.files && transaction.files.length > 0

    // Fetch all categories, recent transaction history, and similar transactions
    const [categories, recentHistory, similarTransactions] = await Promise.all([
      getAllCategories(),
      getCategorizeTransactionHistory(undefined, 100),
      getSimilarTransactions(transaction.merchantName, transaction.name, convexTransactionId),
    ])

    const categoriesContext = buildCategoriesContext(categories as any)
    const historyContext = buildHistoryContext(recentHistory as any)
    const similarContext = buildSimilarTransactionsContext(similarTransactions as any)

    // Get current category info for comparison
    let currentCategoryContext = "None (Uncategorized)"
    if (transaction.categoryId) {
      const currentCategory = categories.find((c) => c.id === transaction.categoryId)
      if (currentCategory) {
        const currentSubcategory = transaction.subcategoryId
          ? currentCategory.subcategories.find((s) => s.id === transaction.subcategoryId)
          : null
        currentCategoryContext = `${currentCategory.name} (ID: ${currentCategory.id})${
          currentSubcategory ? ` > ${currentSubcategory.name} (ID: ${currentSubcategory.id})` : ""
        }`
      }
    }

    const transactionAmount = Math.abs(transaction.amount)
    const transactionType = transaction.amount > 0 ? "expense" : "income"
    const transactionDateStr = new Date(transaction.date).toISOString().split("T")[0]

    // Build the prompt - different versions for with/without receipt images
    const prompt = hasFiles
      ? `You are an expert financial receipt analyzer. Your task is to analyze receipt image(s) and determine the BEST action for this transaction.

TRANSACTION DETAILS:
  Name: ${transaction.name}
  Merchant: ${transaction.merchantName || "N/A"}
  Total Amount: $${transactionAmount.toFixed(2)} (${transactionType})
  Date: ${transactionDateStr}
  Plaid Category: ${transaction.plaidCategory || "N/A"} / ${transaction.plaidSubcategory || "N/A"}
  Notes: ${transaction.notes || "N/A"}
  Current Category: ${currentCategoryContext}

AVAILABLE CATEGORIES:
${categoriesContext}

SIMILAR TRANSACTIONS (same merchant/amount/description):
${similarContext}

RECENT TRANSACTION HISTORY (Last 100 Transactions):
${historyContext}

YOUR DECISION PROCESS:
1. **Examine all items** on the receipt(s) carefully
2. **Identify distinct categories** among the items:

   SCENARIO A: **2 or more distinct categories found on receipt**
   → Return type: "split"
   → Group items by category and sum amounts
   → Create one split per category
   → MUST have at least 2 splits (never split into just 1 category)

   SCENARIO B: **Only 1 category found on receipt**
   → Compare with current category (${currentCategoryContext})
   → If different and more appropriate:
     * Return type: "recategorize"
     * Suggest the better category with reasoning
   → If current category is correct or close enough:
     * Return type: "confirm"
     * Confirm current categorization is good

CRITICAL RULES:
- **NEVER return a split with only 1 category** - that's not a split!
- **Be conservative** - only suggest changes with high confidence (>70%)
- **Learn from history** - respect user's categorization patterns from similar transactions
- **Use exact IDs** - Always use exact category/subcategory IDs from the available list
- **Validate totals** - For splits, sum must equal transaction total ($${transactionAmount.toFixed(2)})
- **Handle tax/fees** - Include proportionally in splits or as separate category

EXAMPLES:

Example 1 (SPLIT - Multiple Categories):
Receipt: Walmart - $50
Items: Apples $5, Bread $5, Milk $10, Soap $15, Detergent $15
→ Return: type="split" with 2 splits:
  * Groceries: $20 (Apples, Bread, Milk)
  * Household: $30 (Soap, Detergent)

Example 2 (RECATEGORIZE - Single Category, Wrong):
Receipt: Starbucks - $25
Items: 2 Lattes $10, Breakfast Sandwich $5, Tip $5, Tax $5
Current: Shopping
→ Return: type="recategorize" to "Coffee Shops" or "Dining"
Reasoning: All items are food/beverage from a coffee shop

Example 3 (CONFIRM - Single Category, Correct):
Receipt: Amazon - $120
Items: 3 Books about finance
Current: Shopping > Books
→ Return: type="confirm"
Message: Current category is appropriate for book purchases

Analyze the receipt(s) and provide your recommended action.`
      : `You are an expert financial transaction categorization analyst. Your task is to analyze transaction metadata and determine if a better category exists.

TRANSACTION DETAILS:
  Name: ${transaction.name}
  Merchant: ${transaction.merchantName || "N/A"}
  Total Amount: $${transactionAmount.toFixed(2)} (${transactionType})
  Date: ${transactionDateStr}
  Plaid Category: ${transaction.plaidCategory || "N/A"} / ${transaction.plaidSubcategory || "N/A"}
  Notes: ${transaction.notes || "N/A"}
  Current Category: ${currentCategoryContext}

AVAILABLE CATEGORIES:
${categoriesContext}

SIMILAR TRANSACTIONS (same merchant/amount/description):
${similarContext}

RECENT TRANSACTION HISTORY (Last 100 Transactions):
${historyContext}

YOUR DECISION PROCESS:
**No receipt available** - analyze based on transaction metadata only

1. **Examine transaction details** (name, merchant, amount, plaid category)
2. **Review similar transactions** - prioritize user's historical categorization patterns
3. **Determine best action**:

   SCENARIO A: **Better category exists**
   → Compare with current category (${currentCategoryContext})
   → If different and more appropriate:
     * Return type: "recategorize"
     * Suggest the better category with reasoning
     * High confidence (>75%) required since no receipt to verify

   SCENARIO B: **Current category is appropriate**
   → Return type: "confirm"
   → Confirm current categorization is good

CRITICAL RULES:
- **WITHOUT receipt, NEVER suggest split** - cannot split without itemized receipt
- **EXTRA conservative** - require high confidence (>75%) for recategorization without receipt
- **Prioritize similar transactions** - if user consistently categorizes this merchant a certain way, respect that pattern
- **Use exact IDs** - Always use exact category/subcategory IDs from the available list
- **Learn from history** - respect user's categorization patterns

EXAMPLES:

Example 1 (RECATEGORIZE - Wrong category, clear from metadata):
Transaction: "STARBUCKS #12345" - $15.50
Current: Shopping
Similar Transactions: Multiple Starbucks transactions categorized as "Coffee Shops"
→ Return: type="recategorize" to "Coffee Shops"
Reasoning: Starbucks is consistently categorized as Coffee Shops by user

Example 2 (CONFIRM - Correct category):
Transaction: "Amazon Marketplace" - $45.99
Current: Shopping > Online
Plaid: GENERAL_MERCHANDISE
→ Return: type="confirm"
Message: Current category matches both Plaid suggestion and transaction type

Analyze the transaction and provide your recommended action.`

    // Helper function to detect file type and convert if needed
    const prepareFileForVision = (fileUrl: string): string => {
      const lowerUrl = fileUrl.toLowerCase()

      // Check if it's a PDF
      if (lowerUrl.includes(".pdf") || lowerUrl.match(/\.pdf(\?|$|#)/)) {
        // Convert PDF to image using Cloudinary transformations
        if (fileUrl.includes("cloudinary.com")) {
          return fileUrl.replace("/upload/", "/upload/f_jpg,pg_1,q_auto,w_2000/")
        }

        logWarn(`PDF detected but not hosted on Cloudinary: ${fileUrl}. Vision API may not support it.`, { fileUrl })
        return fileUrl
      }

      return fileUrl
    }

    // Call OpenAI - different approach based on whether files exist
    let result
    if (hasFiles) {
      // WITH files: Use vision with messages format
      const content: any[] = [
        {
          type: "text",
          text: prompt,
        },
      ]

      // Add each file URL as an image (convert PDFs to images first)
      for (const fileUrl of transaction.files!) {
        const processedUrl = prepareFileForVision(fileUrl)
        content.push({
          type: "image",
          image: processedUrl,
        })
      }

      logInfo(`Smart analysis WITH ${transaction.files!.length} receipt file(s)`, {
        transactionId,
        fileCount: transaction.files!.length,
        files: transaction.files!.map((url) => ({
          original: url,
          processed: prepareFileForVision(url),
          isPdf: url.toLowerCase().includes(".pdf"),
        })),
      })

      result = await generateObject({
        model: openai("gpt-5-mini"),
        schema: SmartAnalysisResultSchema,
        messages: [
          {
            role: "user",
            content,
          },
        ],
      })
    } else {
      // WITHOUT files: Use text-only prompt
      logInfo("Smart analysis WITHOUT receipt (metadata only)", { transactionId })

      result = await generateObject({
        model: openai("gpt-5-mini"),
        schema: SmartAnalysisResultSchema,
        prompt,
      })
    }

    const analysis = result.object.result

    // Additional validation based on type
    if (analysis.type === "split") {
      // CRITICAL: Cannot split without receipt
      if (!hasFiles) {
        logError("AI suggested split but no receipt files available - rejecting suggestion", undefined, {
          transactionId,
        })
        return null
      }
      // Validate that splits sum to transaction amount
      const totalSplits = analysis.splits.reduce((sum, split) => sum + split.amount, 0)
      const difference = Math.abs(totalSplits - transactionAmount)

      if (difference > 0.02) {
        logWarn(
          `Split amounts ($${totalSplits.toFixed(2)}) don't match transaction amount ($${transactionAmount.toFixed(2)}). Difference: $${difference.toFixed(2)}`,
          {
            transactionId,
            totalSplits,
            transactionAmount,
            difference,
          },
        )
        analysis.notes = `Warning: Split total ($${totalSplits.toFixed(2)}) differs from transaction amount ($${transactionAmount.toFixed(2)}) by $${difference.toFixed(2)}. Please review carefully.`
      }

      // Validate that all category IDs are valid
      for (const split of analysis.splits) {
        const category = categories.find((c) => c.id === split.categoryId)
        if (!category) {
          logError(`Invalid category ID "${split.categoryId}" returned by AI`, undefined, {
            transactionId,
            categoryId: split.categoryId,
          })
          return null
        }

        if (split.subcategoryId) {
          const subcategory = category.subcategories.find((s) => s.id === split.subcategoryId)
          if (!subcategory) {
            logWarn(
              `Invalid subcategory ID "${split.subcategoryId}" for category "${category.name}", ignoring subcategory`,
              {
                transactionId,
                subcategoryId: split.subcategoryId,
                categoryName: category.name,
              },
            )
            split.subcategoryId = null
          }
        }
      }

      logInfo(`Smart analysis complete (SPLIT)`, {
        transactionId,
        fileCount: hasFiles ? transaction.files!.length : 0,
        splitsCount: analysis.splits.length,
        confidence: analysis.confidence,
        totalSplits: totalSplits.toFixed(2),
        transactionAmount: transactionAmount.toFixed(2),
      })
    } else if (analysis.type === "recategorize") {
      // Validate category ID exists
      const category = categories.find((c) => c.id === analysis.categoryId)
      if (!category) {
        logError(`Invalid category ID "${analysis.categoryId}" returned by AI`, undefined, {
          transactionId,
          categoryId: analysis.categoryId,
        })
        return null
      }

      if (analysis.subcategoryId) {
        const subcategory = category.subcategories.find((s) => s.id === analysis.subcategoryId)
        if (!subcategory) {
          logWarn(
            `Invalid subcategory ID "${analysis.subcategoryId}" for category "${category.name}", ignoring subcategory`,
            {
              transactionId,
              subcategoryId: analysis.subcategoryId,
              categoryName: category.name,
            },
          )
          analysis.subcategoryId = null
        }
      }

      logInfo(`Smart analysis complete (RECATEGORIZE)`, {
        transactionId,
        hasFiles,
        fileCount: hasFiles ? transaction.files!.length : 0,
        suggestedCategory: category.name,
        currentCategory: currentCategoryContext,
        confidence: analysis.confidence,
      })
    } else {
      // Type: confirm
      logInfo(`Smart analysis complete (CONFIRM)`, {
        transactionId,
        hasFiles,
        fileCount: hasFiles ? transaction.files!.length : 0,
        confidence: analysis.confidence,
        message: analysis.message,
      })
    }

    return analysis
  } catch (error) {
    logError("Error in smart receipt analysis:", error, { transactionId })
    return null
  }
}
