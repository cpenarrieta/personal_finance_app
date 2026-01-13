/**
 * AI-powered transaction categorization using OpenAI via ai-sdk
 * This service is called after new transactions are synced from Plaid
 * Updated for AI SDK v6
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { Category, Prisma, Subcategory, Transaction } from "@prisma/generated"
import { logInfo, logWarn, logError } from "@/lib/utils/logger"

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
type CategoryWithSubs = Category & { subcategories: Subcategory[] }

/**
 * Fetch transactions from the last 2 months for context
 */
async function getRecentTransactionHistory(excludeTransactionId?: string, maxTransactions: number = 100) {
  return prisma.transaction.findMany({
    where: {
      id: excludeTransactionId ? { not: excludeTransactionId } : undefined,
      categoryId: { not: null }, // Only get categorized transactions
      isSplit: false,
    },
    select: {
      name: true,
      merchantName: true,
      amount: true,
      datetime: true,
      category: {
        select: {
          name: true,
          id: true,
        },
      },
      subcategory: {
        select: {
          name: true,
          id: true,
        },
      },
    },
    orderBy: { datetime: "desc" },
    take: maxTransactions,
  })
}

/**
 * Find similar transactions based on merchant, amount, and description
 */
export async function getSimilarTransactions(merchantName: string | null, name: string, excludeTransactionId?: string) {
  // Build conditions for similar transactions
  const conditions: Prisma.TransactionWhereInput[] = []

  // Match by merchant name (if available)
  if (merchantName) {
    conditions.push({
      merchantName: {
        equals: merchantName,
        mode: "insensitive",
      },
      categoryId: { not: null },
    })
  }

  // Match by similar transaction name (fuzzy)
  conditions.push({
    name: {
      contains: name.slice(0, 10), // Use first 10 chars for fuzzy matching
      mode: "insensitive",
    },
    categoryId: { not: null },
  })

  // If no conditions, return empty
  if (conditions.length === 0) {
    return []
  }

  const similarTransactions = (await prisma.transaction.findMany({
    where: {
      OR: conditions,
      id: excludeTransactionId ? { not: excludeTransactionId } : undefined,
      isSplit: false,
    },
    select: {
      name: true,
      merchantName: true,
      amount: true,
      datetime: true,
      category: {
        select: {
          name: true,
          id: true,
        },
      },
      subcategory: {
        select: {
          name: true,
          id: true,
        },
      },
    },
    orderBy: { datetime: "desc" },
    take: 50,
  })) as (Transaction & { category: Category; subcategory: Subcategory })[]

  return similarTransactions
}

/**
 * Fetch all categories once
 */
async function getAllCategories() {
  return (await prisma.category.findMany({
    include: {
      subcategories: true,
    },
    orderBy: { displayOrder: "asc" },
  })) as CategoryWithSubs[]
}

export function buildCategoriesContext(categories: CategoryWithSubs[]): string {
  return categories
    .map((cat) => {
      const subs = cat.subcategories.map((s) => `${s.name} (ID: ${s.id})`).join(", ")
      return `${cat.name} (ID: ${cat.id}): [${subs || "no subcategories"}]`
    })
    .join("\n")
}

export function buildSimilarTransactionsContext(
  similarTransactions: (Transaction & { category: Category; subcategory: Subcategory })[],
): string {
  return similarTransactions.length > 0
    ? similarTransactions
        .map(
          (t: {
            name: string
            amount: Prisma.Decimal
            category: { name: string; id: string } | null
            subcategory: { name: string; id: string } | null
          }) => {
            const amt = Math.abs(t.amount.toNumber()).toFixed(2)
            return `  - "${t.name}" | $${amt} | Category: ${t.category?.name || "N/A"} (ID: ${t.category?.id || "N/A"})${
              t.subcategory ? ` > ${t.subcategory.name} (ID: ${t.subcategory.id})` : ""
            }`
          },
        )
        .join("\n")
    : "  No similar transactions found"
}

export function buildHistoryContext(
  recentHistory: (Transaction & { category: Category; subcategory: Subcategory })[],
): string {
  return recentHistory.length > 0
    ? recentHistory
        .map(
          (t: {
            name: string
            merchantName: string | null
            amount: Prisma.Decimal
            category: { name: string; id: string } | null
            subcategory: { name: string; id: string } | null
          }) => {
            const amt = Math.abs(t.amount.toNumber()).toFixed(2)
            return `  - "${t.merchantName || t.name}" | $${amt} | ${t.category?.name || "N/A"} (ID: ${t.category?.id || "N/A"})${
              t.subcategory ? ` > ${t.subcategory.name} (ID: ${t.subcategory.id})` : ""
            }`
          },
        )
        .join("\n")
    : "  No recent history"
}

interface CategorizeOptions {
  allowRecategorize?: boolean
  preFetchedCategories?: CategoryWithSubs[]
  preFetchedHistory?: (Transaction & { category: Category; subcategory: Subcategory })[]
}

/**
 * Categorize a single transaction using AI
 * @param transactionId - The transaction ID to categorize
 * @param options - Options for categorization including pre-fetched data
 */
export async function categorizeTransaction(
  transactionId: string,
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
    const transaction = (await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        name: true,
        merchantName: true,
        amount: true,
        date: true,
        datetime: true,
        plaidCategory: true,
        plaidSubcategory: true,
        notes: true,
        files: true,
      },
    })) as Transaction | null

    if (!transaction) {
      logError(`Transaction ${transactionId} not found`, undefined, { transactionId })
      return null
    }

    // Skip if already categorized (unless allowRecategorize is true)
    if (!allowRecategorize) {
      const existingCategory = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { categoryId: true },
      })

      if (existingCategory?.categoryId) {
        logInfo(`Transaction ${transactionId} already categorized, skipping`, { transactionId })
        return null
      }
    }

    // Fetch categories if not provided
    const categories = preFetchedCategories || (await getAllCategories())

    // Get similar transactions based on merchant name and transaction name
    // This is specific to the transaction so we can't easily pre-fetch in bulk without complex logic
    const similarTransactions = await getSimilarTransactions(transaction.merchantName, transaction.name, transaction.id)

    // Get recent transaction history if not provided
    const recentHistory = preFetchedHistory || (await getRecentTransactionHistory(transaction.id))

    // Build categorization prompt context
    const categoriesContext = buildCategoriesContext(categories)
    const similarContext = buildSimilarTransactionsContext(similarTransactions as any)
    const historyContext = buildHistoryContext(recentHistory as any)

    const transactionAmount = Math.abs(transaction.amount.toNumber()).toFixed(2)
    const transactionType = transaction.amount.toNumber() > 0 ? "expense" : "income" // negative = income, positive = expense

    const prompt = `You are a financial transaction categorization expert. Your task is to categorize this transaction based on available context.

TRANSACTION TO CATEGORIZE:
  Name: ${transaction.name}
  Merchant: ${transaction.merchantName || "N/A"}
  Amount: $${transactionAmount} (${transactionType})
  Date: ${transaction.date.toISOString().split("T")[0]}
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

    // Helper function to prepare file URLs for vision (convert PDFs to images)
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

    // Call OpenAI using ai-sdk with structured output
    // If transaction has files, use vision with messages format; otherwise use text-only prompt
    let result
    if (transaction.files && transaction.files.length > 0) {
      // Build content array with text and images
      const content: any[] = [
        {
          type: "text",
          text:
            prompt +
            `\n\nATTACHED RECEIPT(S): ${transaction.files.length} file(s) - Use these receipts to help categorize the transaction accurately.`,
        },
      ]

      // Add each file URL as an image
      for (const fileUrl of transaction.files) {
        const processedUrl = prepareFileForVision(fileUrl)
        content.push({
          type: "image",
          image: processedUrl,
        })
      }

      logInfo(`🖼️  Including ${transaction.files.length} receipt file(s) in categorization`, {
        transactionId,
        fileCount: transaction.files.length,
      })

      result = await generateObject({
        model: openai("gpt-5-mini"),
        schema: CategorizationResultSchema,
        messages: [
          {
            role: "user",
            content,
          },
        ],
      })
    } else {
      // No files - use text-only prompt
      result = await generateObject({
        model: openai("gpt-5-mini"),
        schema: CategorizationResultSchema,
        prompt,
      })
    }

    const categorization = result.object

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
async function detectSignMismatch(transactionId: string, categoryId: string): Promise<boolean> {
  const [transaction, category] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { amount: true },
    }),
    prisma.category.findUnique({
      where: { id: categoryId },
      select: { groupType: true },
    }),
  ])

  if (!transaction || !category?.groupType) return false

  const amount = transaction.amount.toNumber()
  // Convention: positive amount = expense, negative = income
  // INCOME category should have negative amount
  // EXPENSES category should have positive amount
  if (category.groupType === "INCOME" && amount > 0) return true
  if (category.groupType === "EXPENSES" && amount < 0) return true

  return false
}

/**
 * Apply categorization and add "for-review" tag to a transaction
 * Also adds "sign-review" tag if amount sign doesn't match category type
 */
export async function applyCategorization(
  transactionId: string,
  categoryId: string,
  subcategoryId: string | null,
  skipReviewTag: boolean = false,
): Promise<void> {
  try {
    const tagsToConnect: { tagId: string }[] = []

    if (!skipReviewTag) {
      // Ensure "for-review" tag exists
      const forReviewTag = await prisma.tag.upsert({
        where: { name: "for-review" },
        update: {},
        create: {
          name: "for-review",
          color: "#fbbf24", // Yellow color for review
        },
      })
      tagsToConnect.push({ tagId: forReviewTag.id })
    }

    // Check for sign mismatch and add "sign-review" tag if needed
    const hasSignMismatch = await detectSignMismatch(transactionId, categoryId)
    if (hasSignMismatch) {
      const signReviewTag = await prisma.tag.upsert({
        where: { name: "sign-review" },
        update: {},
        create: {
          name: "sign-review",
          color: "#f97316", // Orange color for sign review
        },
      })
      tagsToConnect.push({ tagId: signReviewTag.id })
      logInfo(`⚠️  Sign mismatch detected for transaction ${transactionId}`, { transactionId, categoryId })
    }

    // Build tags update
    const tagsUpdate =
      tagsToConnect.length > 0
        ? {
            connectOrCreate: tagsToConnect.map((tag) => ({
              where: {
                transactionId_tagId: {
                  transactionId,
                  tagId: tag.tagId,
                },
              },
              create: {
                tagId: tag.tagId,
              },
            })),
          }
        : undefined

    // Update transaction with category and optionally add tags
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categoryId,
        subcategoryId,
        tags: tagsUpdate,
      },
    })

    logInfo(
      `✅ Applied categorization${!skipReviewTag ? " and for-review tag" : ""}${hasSignMismatch ? " and sign-review tag" : ""} to transaction ${transactionId}`,
      {
        transactionId,
        categoryId,
        subcategoryId,
        hasReviewTag: !skipReviewTag,
        hasSignMismatch,
      },
    )
  } catch (error) {
    logError("Error applying categorization:", error, { transactionId, categoryId, subcategoryId })
    throw error
  }
}

// Type for transaction data used in batch categorization
interface TransactionForBatch {
  id: string
  name: string
  merchantName: string | null
  amount: Prisma.Decimal
  date: Date
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
  recentHistory: (Transaction & { category: Category; subcategory: Subcategory })[],
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
  const historyContext = buildHistoryContext(recentHistory as any)

  // Build transactions list for prompt
  const transactionsContext = transactions
    .map((t, index) => {
      const amount = Math.abs(t.amount.toNumber()).toFixed(2)
      const type = t.amount.toNumber() > 0 ? "expense" : "income"
      return `[${index}] Name: "${t.name}" | Merchant: ${t.merchantName || "N/A"} | Amount: $${amount} (${type}) | Date: ${t.date.toISOString().split("T")[0]} | Plaid: ${t.plaidCategory || "N/A"}/${t.plaidSubcategory || "N/A"}`
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
    const result = await generateObject({
      model: openai("gpt-5-mini"),
      schema: BatchCategorizationResultSchema,
      prompt,
    })

    // Process results
    for (const item of result.object.results) {
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
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        categoryId: null, // Only uncategorized transactions
      },
      select: {
        id: true,
        name: true,
        merchantName: true,
        amount: true,
        date: true,
        plaidCategory: true,
        plaidSubcategory: true,
        notes: true,
      },
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

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)

      logInfo(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(transactions.length / BATCH_SIZE)}...`)

      // Single LLM call for the batch
      const batchResults = await categorizeTransactionsBatch(
        batch as TransactionForBatch[],
        categories,
        recentHistory as any,
      )

      // Apply categorizations and add for-review tag
      // Ensure both review tags exist (once per batch)
      const [forReviewTag, signReviewTag] = await Promise.all([
        prisma.tag.upsert({
          where: { name: "for-review" },
          update: {},
          create: { name: "for-review", color: "#fbbf24" },
        }),
        prisma.tag.upsert({
          where: { name: "sign-review" },
          update: {},
          create: { name: "sign-review", color: "#f97316" },
        }),
      ])

      // Build category groupType map for sign mismatch detection
      const categoryGroupTypes = new Map(categories.map((c) => [c.id, c.groupType]))

      for (const tx of batch) {
        const result = batchResults.get(tx.id)
        if (result && result.categoryId) {
          const tagsToConnect: { tagId: string }[] = [{ tagId: forReviewTag.id }]

          // Check for sign mismatch
          const groupType = categoryGroupTypes.get(result.categoryId)
          const amount = tx.amount.toNumber()
          const hasSignMismatch = (groupType === "INCOME" && amount > 0) || (groupType === "EXPENSES" && amount < 0)

          if (hasSignMismatch) {
            tagsToConnect.push({ tagId: signReviewTag.id })
            logInfo(`⚠️  Sign mismatch detected for transaction ${tx.id}`, {
              transactionId: tx.id,
              categoryId: result.categoryId,
            })
          }

          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              categoryId: result.categoryId,
              subcategoryId: result.subcategoryId,
              tags: {
                connectOrCreate: tagsToConnect.map((tag) => ({
                  where: {
                    transactionId_tagId: {
                      transactionId: tx.id,
                      tagId: tag.tagId,
                    },
                  },
                  create: {
                    tagId: tag.tagId,
                  },
                })),
              },
            },
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
