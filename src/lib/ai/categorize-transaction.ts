/**
 * AI-powered transaction categorization using OpenAI via ai-sdk
 * This service is called after new transactions are synced from Plaid
 * Updated to use Convex instead of Prisma
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { z } from "zod"
import { logInfo, logError } from "@/lib/utils/logger"
import { getR2DownloadUrl } from "@/lib/r2/client"

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for AI response (single transaction)
const CategorizationResultSchema = z.object({
  categoryId: z.string().nullable().describe("The category ID, or null if uncertain"),
  subcategoryId: z.string().nullable().describe("The subcategory ID, or null if uncertain"),
  confidence: z.number().min(0).max(100).describe("Confidence score from 0-100"),
  reasoning: z.string().max(500).describe("Brief explanation for the categorization decision"),
})

// Schema for batch AI response (multiple transactions)
const BatchCategorizationResultSchema = z.object({
  results: z.array(
    z.object({
      transactionIndex: z.number().describe("The index of the transaction in the input array (0-based)"),
      categoryId: z.string().nullable().describe("The category ID, or null if uncertain"),
      subcategoryId: z.string().nullable().describe("The subcategory ID, or null if uncertain"),
      confidence: z.number().min(0).max(100).describe("Confidence score from 0-100"),
      reasoning: z.string().max(500).describe("Brief explanation for the categorization decision"),
    }),
  ),
})

// Type for categories with subcategories
interface CategoryWithSubs {
  id: Id<"categories">
  name: string
  groupType: string | null
  displayOrder: number
  subcategories: Array<{ id: Id<"subcategories">; name: string }>
}

// Type for transaction history
interface TransactionHistoryItem {
  name: string
  merchantName: string | null
  amount: number
  datetime: string
  category: { id: string; name: string } | null
  subcategory: { id: string; name: string } | null
}

/**
 * Fetch transactions from the last 2 months for context
 */
export async function getRecentTransactionHistory(
  excludeTransactionId?: Id<"transactions">,
  maxTransactions: number = 100,
): Promise<TransactionHistoryItem[]> {
  return fetchQuery(api.sync.getRecentCategorizedTransactions, {
    limit: maxTransactions,
    excludeId: excludeTransactionId,
  })
}

/**
 * Find similar transactions based on merchant, amount, and description
 */
export async function getSimilarTransactions(
  merchantName: string | null,
  name: string,
  excludeTransactionId?: Id<"transactions">,
): Promise<TransactionHistoryItem[]> {
  return fetchQuery(api.sync.getSimilarTransactions, {
    merchantName: merchantName ?? undefined,
    name,
    excludeId: excludeTransactionId,
  })
}

/**
 * Fetch all categories once
 */
async function getAllCategories(): Promise<CategoryWithSubs[]> {
  return fetchQuery(api.sync.getAllCategoriesWithSubcategories)
}

export function buildCategoriesContext(categories: CategoryWithSubs[]): string {
  return categories
    .map((cat) => {
      const subs = cat.subcategories.map((s) => `${s.name} (ID: ${s.id})`).join(", ")
      return `${cat.name} (ID: ${cat.id}): [${subs || "no subcategories"}]`
    })
    .join("\n")
}

export function buildSimilarTransactionsContext(similarTransactions: TransactionHistoryItem[]): string {
  return similarTransactions.length > 0
    ? similarTransactions
        .map((t) => {
          const amt = Math.abs(t.amount).toFixed(2)
          return `  - "${t.name}" | $${amt} | Category: ${t.category?.name || "N/A"} (ID: ${t.category?.id || "N/A"})${
            t.subcategory ? ` > ${t.subcategory.name} (ID: ${t.subcategory.id})` : ""
          }`
        })
        .join("\n")
    : "  No similar transactions found"
}

export function buildHistoryContext(recentHistory: TransactionHistoryItem[]): string {
  return recentHistory.length > 0
    ? recentHistory
        .map((t) => {
          const amt = Math.abs(t.amount).toFixed(2)
          return `  - "${t.merchantName || t.name}" | $${amt} | ${t.category?.name || "N/A"} (ID: ${t.category?.id || "N/A"})${
            t.subcategory ? ` > ${t.subcategory.name} (ID: ${t.subcategory.id})` : ""
          }`
        })
        .join("\n")
    : "  No recent history"
}

interface CategorizeOptions {
  allowRecategorize?: boolean
  preFetchedCategories?: CategoryWithSubs[]
  preFetchedHistory?: TransactionHistoryItem[]
}

/**
 * Categorize a single transaction using AI
 * @param transactionId - The transaction ID to categorize
 * @param options - Options for categorization including pre-fetched data
 */
export async function categorizeTransaction(
  transactionId: Id<"transactions">,
  options: CategorizeOptions = {},
): Promise<{
  categoryId: string | null
  subcategoryId: string | null
  confidence: number
  reasoning: string
} | null> {
  const { allowRecategorize = false, preFetchedCategories, preFetchedHistory } = options

  try {
    // Fetch the transaction to be categorized
    const transaction = await fetchQuery(api.sync.getTransactionForCategorization, { id: transactionId })

    if (!transaction) {
      logError(`Transaction ${transactionId} not found`, undefined, { transactionId })
      return null
    }

    // Skip if already categorized (unless allowRecategorize is true)
    if (!allowRecategorize && transaction.categoryId) {
      logInfo(`Transaction ${transactionId} already categorized, skipping`, { transactionId })
      return null
    }

    // Fetch categories if not provided
    const categories = preFetchedCategories || (await getAllCategories())

    // Get similar transactions based on merchant name and transaction name
    const similarTransactions = await getSimilarTransactions(transaction.merchantName, transaction.name, transactionId)

    // Get recent transaction history if not provided
    const recentHistory = preFetchedHistory || (await getRecentTransactionHistory(transactionId))

    // Build categorization prompt context
    const categoriesContext = buildCategoriesContext(categories)
    const similarContext = buildSimilarTransactionsContext(similarTransactions)
    const historyContext = buildHistoryContext(recentHistory)

    const transactionAmount = Math.abs(transaction.amount).toFixed(2)
    const transactionType = transaction.amount < 0 ? "expense" : "income" // negative = expense, positive = income
    const dateStr = new Date(transaction.date).toISOString().split("T")[0]

    const prompt = `You are a financial transaction categorization expert. Your task is to categorize this transaction based on available context.

TRANSACTION TO CATEGORIZE:
  Name: ${transaction.name}
  Merchant: ${transaction.merchantName || "N/A"}
  Amount: $${transactionAmount} (${transactionType})
  Date: ${dateStr}
  Plaid Category: ${transaction.plaidCategory || "N/A"} / ${transaction.plaidSubcategory || "N/A"}
  Notes: ${transaction.notes || "N/A"}

AVAILABLE CATEGORIES:
${categoriesContext}

SIMILAR TRANSACTIONS (same merchant/amount/description):
${similarContext}

RECENT TRANSACTION HISTORY:
${historyContext}

INSTRUCTIONS:
1. Prioritize similar transactions - if there are transactions with the same merchant or description that have been categorized, use that pattern
2. Consider the transaction history to understand spending patterns
3. Use the Plaid category as a fallback reference but this is not always the best category it makes several mistakes
4. Consider the amount and transaction type (expense vs income)
5. Only assign a category if confidence > 60
6. If you can't match a subcategory but the category is clear, just use the category
7. Use exact category/subcategory IDs from the available categories list
8. Be conservative - when in doubt, return null values

Provide your categorization decision with confidence and reasoning.`

    // Call OpenAI using ai-sdk with structured output
    let result
    if (transaction.files && transaction.files.length > 0) {
      // Build content array with text and file attachments
      const content: any[] = [
        {
          type: "text",
          text:
            prompt +
            `\n\nATTACHED RECEIPT(S): ${transaction.files.length} file(s) - Use these receipts to help categorize the transaction accurately.`,
        },
      ]

      // Add each file via presigned R2 URL
      for (const fileKey of transaction.files) {
        const presignedUrl = await getR2DownloadUrl(fileKey)
        const ext = fileKey.split(".").pop()?.toLowerCase()

        if (ext === "pdf") {
          content.push({
            type: "file",
            data: new URL(presignedUrl),
            mediaType: "application/pdf",
          })
        } else {
          content.push({
            type: "image",
            image: presignedUrl,
          })
        }
      }

      logInfo(`Including ${transaction.files.length} receipt file(s) in categorization`, {
        transactionId,
        fileCount: transaction.files.length,
      })

      result = await generateText({
        model: openai("gpt-5-mini"),
        output: Output.object({ schema: CategorizationResultSchema }),
        messages: [
          {
            role: "user",
            content,
          },
        ],
      })
    } else {
      // No files - use text-only prompt
      result = await generateText({
        model: openai("gpt-5-mini"),
        output: Output.object({ schema: CategorizationResultSchema }),
        prompt,
      })
    }

    const categorization = result.output!

    // Log the result
    logInfo(`🤖 AI Categorization for "${transaction.name}"`, {
      transactionId,
      transactionName: transaction.name,
      categoryId: categorization.categoryId,
      subcategoryId: categorization.subcategoryId,
      confidence: categorization.confidence,
      reasoning: categorization.reasoning,
    })

    // If confidence is too low or no category suggested, return null
    if (!categorization.categoryId || categorization.confidence <= 60) {
      logInfo(`⚠️  Low confidence (${categorization.confidence}), skipping auto-categorization`, {
        transactionId,
        confidence: categorization.confidence,
      })
      return null
    }

    // Find the category and subcategory IDs
    const category = categories.find((c) => c.id === categorization.categoryId)
    if (!category) {
      logError(`Category ID "${categorization.categoryId}" not found`, undefined, {
        transactionId,
        categoryId: categorization.categoryId,
      })
      return null
    }

    const subcategory = categorization.subcategoryId
      ? category.subcategories.find((s) => s.id === categorization.subcategoryId)
      : null

    return {
      categoryId: category.id,
      subcategoryId: subcategory?.id || null,
      confidence: categorization.confidence,
      reasoning: categorization.reasoning,
    }
  } catch (error) {
    logError("Error categorizing transaction:", error, { transactionId })
    return null
  }
}

/**
 * Check if transaction amount sign mismatches category type
 * Returns true if sign appears incorrect (e.g., income category with expense sign)
 */
function detectSignMismatch(amount: number, groupType: string | null): boolean {
  if (!groupType) return false

  // Convention: negative amount = expense, positive = income
  // INCOME category should have positive amount
  // EXPENSES category should have negative amount
  if (groupType === "INCOME" && amount < 0) return true // income shouldn't be negative
  if (groupType === "EXPENSES" && amount > 0) return true // expense shouldn't be positive

  return false
}

/**
 * Apply categorization and add "for-review" tag to a transaction
 * Also adds "sign-review" tag if amount sign doesn't match category type
 */
export async function applyCategorization(
  transactionId: Id<"transactions">,
  categoryId: Id<"categories">,
  subcategoryId: Id<"subcategories"> | null,
  skipReviewTag: boolean = false,
): Promise<void> {
  try {
    const tagIds: Id<"tags">[] = []

    // Get the transaction to check amount
    const transaction = await fetchQuery(api.sync.getTransactionForCategorization, { id: transactionId })

    // Get or create review tags
    const { forReviewTagId, signReviewTagId } = await fetchMutation(api.sync.getOrCreateReviewTags, {})

    if (!skipReviewTag) {
      tagIds.push(forReviewTagId)
    }

    // Get category to check groupType
    const categories = await fetchQuery(api.sync.getAllCategoriesWithSubcategories)
    const category = categories.find((c) => c.id === categoryId)

    // Check for sign mismatch
    if (transaction && category) {
      const hasSignMismatch = detectSignMismatch(transaction.amount, category.groupType)
      if (hasSignMismatch) {
        tagIds.push(signReviewTagId)
        logInfo(`⚠️  Sign mismatch detected for transaction ${transactionId}`, { transactionId, categoryId })
      }
    }

    // Apply categorization with tags
    await fetchMutation(api.sync.applyCategorization, {
      transactionId,
      categoryId,
      subcategoryId: subcategoryId ?? undefined,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    })

    logInfo(`✅ Applied categorization${!skipReviewTag ? " and for-review tag" : ""} to transaction ${transactionId}`, {
      transactionId,
      categoryId,
      subcategoryId,
      hasReviewTag: !skipReviewTag,
    })
  } catch (error) {
    logError("Error applying categorization:", error, { transactionId, categoryId, subcategoryId })
    throw error
  }
}

// Type for transaction data used in batch categorization
interface TransactionForBatch {
  id: Id<"transactions">
  name: string
  merchantName: string | null
  amount: number
  date: number
  plaidCategory: string | null
  plaidSubcategory: string | null
  notes: string | null
}

/**
 * Batch categorize multiple transactions in a single LLM call
 * More efficient than individual calls when categorizing many transactions at once
 */
async function categorizeTransactionsBatch(
  transactions: TransactionForBatch[],
  categories: CategoryWithSubs[],
  recentHistory: TransactionHistoryItem[],
): Promise<
  Map<
    string,
    {
      categoryId: string | null
      subcategoryId: string | null
      confidence: number
      reasoning: string
    }
  >
> {
  const resultMap = new Map<
    string,
    {
      categoryId: string | null
      subcategoryId: string | null
      confidence: number
      reasoning: string
    }
  >()

  if (transactions.length === 0) return resultMap

  // Build shared context
  const categoriesContext = buildCategoriesContext(categories)
  const historyContext = buildHistoryContext(recentHistory)

  // Build transactions list for prompt
  const transactionsContext = transactions
    .map((t, index) => {
      const amount = Math.abs(t.amount).toFixed(2)
      const type = t.amount < 0 ? "expense" : "income"
      const dateStr = new Date(t.date).toISOString().split("T")[0]
      return `[${index}] Name: "${t.name}" | Merchant: ${t.merchantName || "N/A"} | Amount: $${amount} (${type}) | Date: ${dateStr} | Plaid: ${t.plaidCategory || "N/A"}/${t.plaidSubcategory || "N/A"}`
    })
    .join("\n")

  const prompt = `You are a financial transaction categorization expert. Categorize ALL the following transactions based on the available context.

TRANSACTIONS TO CATEGORIZE:
${transactionsContext}

AVAILABLE CATEGORIES:
${categoriesContext}

RECENT TRANSACTION HISTORY (for context on user's spending patterns):
${historyContext}

INSTRUCTIONS:
1. Categorize EVERY transaction in the list above
2. Look for patterns - if multiple transactions have similar merchants/names, they likely belong to the same category
3. Use the transaction history to understand spending patterns
4. Use the Plaid category as a fallback reference but it's not always accurate
5. Consider the amount and transaction type (expense vs income)
6. Only assign a category if confidence > 60, otherwise use null
7. If you can't match a subcategory but the category is clear, just use the category (subcategoryId = null)
8. Use exact category/subcategory IDs from the available categories list
9. Be conservative - when in doubt, return null values
10. Return results for ALL ${transactions.length} transactions using their index (0 to ${transactions.length - 1})
11. Keep reasoning brief - max 300 characters per transaction

Provide categorization for each transaction with confidence and brief reasoning.`

  try {
    const batchResult = await generateText({
      model: openai("gpt-5-mini"),
      output: Output.object({ schema: BatchCategorizationResultSchema }),
      prompt,
    })

    // Process results
    for (const item of batchResult.output!.results) {
      const transaction = transactions[item.transactionIndex]
      if (!transaction) continue

      // Validate category exists
      if (item.categoryId && item.confidence > 60) {
        const category = categories.find((c) => c.id === item.categoryId)
        if (category) {
          const subcategory = item.subcategoryId
            ? category.subcategories.find((s) => s.id === item.subcategoryId)
            : null

          resultMap.set(transaction.id, {
            categoryId: category.id,
            subcategoryId: subcategory?.id || null,
            confidence: item.confidence,
            reasoning: item.reasoning,
          })

          logInfo(`🤖 Batch categorized "${transaction.name}"`, {
            transactionId: transaction.id,
            categoryId: category.id,
            subcategoryId: subcategory?.id || null,
            confidence: item.confidence,
          })
        }
      } else {
        logInfo(`⚠️  Low confidence (${item.confidence}) for "${transaction.name}", skipping`, {
          transactionId: transaction.id,
          confidence: item.confidence,
        })
      }
    }

    return resultMap
  } catch (error) {
    logError("Error in batch categorization:", error, { transactionCount: transactions.length })
    return resultMap
  }
}

/**
 * Bulk categorize multiple transactions
 * Uses batch LLM call for efficiency - single API call for all transactions
 */
export async function categorizeTransactions(
  transactionIds: string[],
  _options: CategorizeOptions = {},
): Promise<void> {
  if (transactionIds.length === 0) return

  logInfo(`🔄 Starting batch categorization for ${transactionIds.length} transactions...`, {
    transactionCount: transactionIds.length,
  })

  try {
    // 1. Fetch shared context once
    const [categories, recentHistory] = await Promise.all([getAllCategories(), getRecentTransactionHistory()])

    // 2. Fetch all transactions to categorize
    const transactions = await fetchQuery(api.sync.getUncategorizedTransactions, {
      ids: transactionIds as Id<"transactions">[],
    })

    if (transactions.length === 0) {
      logInfo("All transactions already categorized, skipping batch")
      return
    }

    logInfo(`📦 Found ${transactions.length} uncategorized transaction(s) to process`)

    // 3. Process in batches of 20 (to avoid token limits)
    const BATCH_SIZE = 20
    let categorizedCount = 0
    let skippedCount = 0

    // Get or create review tags once
    const { forReviewTagId, signReviewTagId } = await fetchMutation(api.sync.getOrCreateReviewTags, {})

    // Build category groupType map for sign mismatch detection
    const categoryGroupTypes = new Map(categories.map((c) => [c.id, c.groupType]))

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)

      logInfo(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(transactions.length / BATCH_SIZE)}...`)

      // Single LLM call for the batch
      const batchResults = await categorizeTransactionsBatch(batch as TransactionForBatch[], categories, recentHistory)

      // Apply categorizations
      for (const tx of batch) {
        const result = batchResults.get(tx.id)
        if (result && result.categoryId) {
          const tagIds: Id<"tags">[] = [forReviewTagId]

          // Check for sign mismatch
          const groupType = categoryGroupTypes.get(result.categoryId as Id<"categories">)
          const hasSignMismatch = detectSignMismatch(tx.amount, groupType ?? null)

          if (hasSignMismatch) {
            tagIds.push(signReviewTagId)
            logInfo(`⚠️  Sign mismatch detected for transaction ${tx.id}`, {
              transactionId: tx.id,
              categoryId: result.categoryId,
            })
          }

          await fetchMutation(api.sync.applyCategorization, {
            transactionId: tx.id as Id<"transactions">,
            categoryId: result.categoryId as Id<"categories">,
            subcategoryId: result.subcategoryId ? (result.subcategoryId as Id<"subcategories">) : undefined,
            tagIds,
          })
          categorizedCount++
        } else {
          skippedCount++
        }
      }
    }

    logInfo(`✅ Batch categorization complete`, {
      total: transactionIds.length,
      processed: transactions.length,
      categorized: categorizedCount,
      skipped: skippedCount,
    })
  } catch (error) {
    logError("Error in batch categorization:", error, { transactionCount: transactionIds.length })
  }
}
