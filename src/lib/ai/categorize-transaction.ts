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

/**
 * Fetch transactions from the last 2 months for context
 */
async function getRecentTransactionHistory(excludeTransactionId?: string, maxTransactions: number = 200) {
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
async function getSimilarTransactions(merchantName: string | null, name: string, excludeTransactionId?: string) {
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
    take: 200,
  })) as (Transaction & { category: Category; subcategory: Subcategory })[]

  return similarTransactions
}

/**
 * Categorize a single transaction using AI
 * @param transactionId - The transaction ID to categorize
 * @param allowRecategorize - If true, allows re-categorization of already categorized transactions
 */
export async function categorizeTransaction(
  transactionId: string,
  allowRecategorize: boolean = false,
): Promise<{
  categoryId: string | null
  subcategoryId: string | null
  confidence: number
  reasoning: string
} | null> {
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

    // Fetch all available categories
    const categories = (await prisma.category.findMany({
      include: {
        subcategories: true,
      },
      orderBy: { displayOrder: "asc" },
    })) as (Category & { subcategories: Subcategory[] })[]

    // Get similar transactions based on merchant name and transaction name
    const similarTransactions = await getSimilarTransactions(transaction.merchantName, transaction.name, transaction.id)

    // Get recent transaction history
    const recentHistory = await getRecentTransactionHistory(transaction.id)

    // Build categorization prompt context
    const categoriesContext = categories
      .map((cat) => {
        const subs = cat.subcategories.map((s) => `${s.name} (ID: ${s.id})`).join(", ")
        return `${cat.name} (ID: ${cat.id}): [${subs || "no subcategories"}]`
      })
      .join("\n")

    const similarContext =
      similarTransactions.length > 0
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

    const historyContext =
      recentHistory.length > 0
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

RECENT TRANSACTION HISTORY (last 200 transactions):
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
    const result = await generateObject({
      model: openai("gpt-5-mini-2025-08-07"),
      schema: CategorizationResultSchema,
      prompt,
    })

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
): Promise<void> {
  try {
    // Ensure "for-review" tag exists
    const forReviewTag = await prisma.tag.upsert({
      where: { name: "for-review" },
      update: {},
      create: {
        name: "for-review",
        color: "#fbbf24", // Yellow color for review
      },
    })

    // Update transaction with category and add tag
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categoryId,
        subcategoryId,
        tags: {
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
        },
      },
    })

    console.log(`✅ Applied categorization and for-review tag to transaction ${transactionId}`)
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
