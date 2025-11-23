/**
 * AI-powered transaction categorization using OpenAI via ai-sdk
 * This service is called after new transactions are synced from Plaid
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { Category, Prisma, Subcategory, Transaction } from "@prisma/client"

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for AI response
const CategorizationResultSchema = z.object({
  categoryId: z.string().nullable().describe("The category ID, or null if uncertain"),
  subcategoryId: z.string().nullable().describe("The subcategory ID, or null if uncertain"),
  confidence: z.number().min(0).max(100).describe("Confidence score from 0-100"),
  reasoning: z.string().max(500).describe("Brief explanation for the categorization decision"),
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
  }) as (Transaction & { category: Category; subcategory: Subcategory })[]
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
      console.error(`Transaction ${transactionId} not found`)
      return null
    }

    // Skip if already categorized (unless allowRecategorize is true)
    if (!allowRecategorize) {
      const existingCategory = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { categoryId: true },
      })

      if (existingCategory?.categoryId) {
        console.log(`Transaction ${transactionId} already categorized, skipping`)
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

        console.warn(`PDF detected but not hosted on Cloudinary: ${fileUrl}. Vision API may not support it.`)
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

      console.log(`🖼️  Including ${transaction.files.length} receipt file(s) in categorization`)

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
    console.log(`🤖 AI Categorization for "${transaction.name}":`, {
      categoryId: categorization.categoryId,
      subcategoryId: categorization.subcategoryId,
      confidence: categorization.confidence,
      reasoning: categorization.reasoning,
    })

    // If confidence is too low or no category suggested, return null
    if (!categorization.categoryId || categorization.confidence <= 60) {
      console.log(`⚠️  Low confidence (${categorization.confidence}), skipping auto-categorization`)
      return null
    }

    // Find the category and subcategory IDs
    const category = categories.find((c) => c.id === categorization.categoryId)
    if (!category) {
      console.error(`Category ID "${categorization.categoryId}" not found`)
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
    console.error("Error categorizing transaction:", error)
    return null
  }
}

/**
 * Apply categorization and add "for-review" tag to a transaction
 */
export async function applyCategorization(
  transactionId: string,
  categoryId: string,
  subcategoryId: string | null,
  skipReviewTag: boolean = false,
): Promise<void> {
  try {
    let tagsUpdate = {}

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

      tagsUpdate = {
        connectOrCreate: {
          where: {
            transactionId_tagId: {
              transactionId,
              tagId: forReviewTag.id,
            },
          },
          create: {
            tagId: forReviewTag.id,
          },
        },
      }
    }

    // Update transaction with category and optionally add tag
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categoryId,
        subcategoryId,
        tags: !skipReviewTag ? tagsUpdate : undefined,
      },
    })

    console.log(
      `✅ Applied categorization${!skipReviewTag ? " and for-review tag" : ""} to transaction ${transactionId}`,
    )
  } catch (error) {
    console.error("Error applying categorization:", error)
    throw error
  }
}

/**
 * Main function to categorize and apply to a newly synced transaction
 */
export async function categorizeAndApply(transactionId: string): Promise<void> {
  const result = await categorizeTransaction(transactionId)

  if (result && result.categoryId) {
    await applyCategorization(transactionId, result.categoryId, result.subcategoryId)
  } else {
    console.log(`ℹ️  Skipping auto-categorization for transaction ${transactionId}`)
  }
}

/**
 * Bulk categorize multiple transactions
 * Handles fetching shared context once and processing in parallel with concurrency limits
 */
export async function categorizeTransactions(transactionIds: string[], options: CategorizeOptions = {}): Promise<void> {
  if (transactionIds.length === 0) return

  console.log(`🔄 Starting bulk categorization for ${transactionIds.length} transactions...`)

  try {
    // 1. Fetch shared context once
    const [categories, recentHistory] = await Promise.all([getAllCategories(), getRecentTransactionHistory()])

    // 2. Define concurrency limit (e.g., 5 concurrent requests to avoid rate limits)
    const CONCURRENCY_LIMIT = 5
    const results = []

    // 3. Process in chunks
    for (let i = 0; i < transactionIds.length; i += CONCURRENCY_LIMIT) {
      const chunk = transactionIds.slice(i, i + CONCURRENCY_LIMIT)
      const chunkPromises = chunk.map(async (id) => {
        try {
          // Merge the pre-fetched data into the options for each call
          const txOptions: CategorizeOptions = {
            ...options,
            preFetchedCategories: categories,
            preFetchedHistory: recentHistory,
          }

          const result = await categorizeTransaction(id, txOptions)
          if (result && result.categoryId) {
            await applyCategorization(id, result.categoryId, result.subcategoryId)
            return { id, status: "categorized", result }
          } else {
            return { id, status: "skipped" }
          }
        } catch (error) {
          console.error(`Failed to categorize transaction ${id}`, error)
          return { id, status: "error", error }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)
    }

    console.log(
      `✅ Bulk categorization complete. Categorized: ${results.filter((r) => r.status === "categorized").length}, Skipped: ${results.filter((r) => r.status === "skipped").length}, Errors: ${results.filter((r) => r.status === "error").length}`,
    )
  } catch (error) {
    console.error("Error in bulk categorization:", error)
  }
}
