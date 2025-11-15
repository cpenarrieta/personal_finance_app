/**
 * AI-powered transaction categorization using OpenAI via ai-sdk
 * This service is called after new transactions are synced from Plaid
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { Prisma } from "@prisma/client"

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for AI response
const CategorizationResultSchema = z.object({
  categoryName: z.string().nullable().describe("The category name, or null if uncertain"),
  subcategoryName: z.string().nullable().describe("The subcategory name, or null if uncertain"),
  confidence: z.number().min(0).max(100).describe("Confidence score from 0-100"),
  reasoning: z.string().describe("Brief explanation for the categorization decision"),
})

/**
 * Fetch transactions from the last 2 months for context
 */
async function getRecentTransactionHistory(excludeTransactionId?: string) {
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  return prisma.transaction.findMany({
    where: {
      date: {
        gte: twoMonthsAgo,
      },
      id: excludeTransactionId ? { not: excludeTransactionId } : undefined,
      categoryId: { not: null }, // Only get categorized transactions
      isSplit: false,
    },
    select: {
      name: true,
      merchantName: true,
      amount: true,
      date: true,
      category: {
        select: {
          name: true,
        },
      },
      subcategory: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 100, // Limit to most recent 100 to keep context manageable
  })
}

/**
 * Find similar transactions based on merchant, amount, and description
 */
async function getSimilarTransactions(
  merchantName: string | null,
  name: string,
  amount: Prisma.Decimal,
  excludeTransactionId?: string,
) {
  // Convert amount to number for comparison
  const amountNum = amount.toNumber()
  const amountTolerance = Math.abs(amountNum) * 0.1 // 10% tolerance

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

  const similarTransactions = await prisma.transaction.findMany({
    where: {
      OR: conditions,
      id: excludeTransactionId ? { not: excludeTransactionId } : undefined,
      isSplit: false,
    },
    select: {
      name: true,
      merchantName: true,
      amount: true,
      date: true,
      category: {
        select: {
          name: true,
        },
      },
      subcategory: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 20, // Limit to 20 most similar
  })

  // Filter by amount tolerance
  return similarTransactions.filter((t: { amount: Prisma.Decimal }) => {
    const diff = Math.abs(Math.abs(t.amount.toNumber()) - Math.abs(amountNum))
    return diff <= amountTolerance
  })
}

/**
 * Categorize a single transaction using AI
 */
export async function categorizeTransaction(transactionId: string): Promise<{
  categoryId: string | null
  subcategoryId: string | null
  confidence: number
  reasoning: string
} | null> {
  try {
    // Fetch the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
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

    if (!transaction) {
      console.error(`Transaction ${transactionId} not found`)
      return null
    }

    // Skip if already categorized
    const existingCategory = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { categoryId: true },
    })

    if (existingCategory?.categoryId) {
      console.log(`Transaction ${transactionId} already categorized, skipping`)
      return null
    }

    // Fetch all available categories
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
      },
      orderBy: { displayOrder: "asc" },
    })

    // Get similar transactions
    const similarTransactions = await getSimilarTransactions(
      transaction.merchantName,
      transaction.name,
      transaction.amount,
      transaction.id,
    )

    // Get recent transaction history
    const recentHistory = await getRecentTransactionHistory(transaction.id)

    // Build prompt context
    const categoriesContext = categories
      .map((cat: { name: string; subcategories: Array<{ name: string }> }) => {
        const subs = cat.subcategories.map((s: { name: string }) => s.name).join(", ")
        return `${cat.name}: [${subs || "no subcategories"}]`
      })
      .join("\n")

    const similarContext =
      similarTransactions.length > 0
        ? similarTransactions
            .map(
              (t: {
                name: string
                amount: Prisma.Decimal
                category: { name: string } | null
                subcategory: { name: string } | null
              }) => {
                const amt = Math.abs(t.amount.toNumber()).toFixed(2)
                return `  - "${t.name}" | $${amt} | Category: ${t.category?.name || "N/A"}${t.subcategory ? ` > ${t.subcategory.name}` : ""}`
              },
            )
            .join("\n")
        : "  No similar transactions found"

    const historyContext =
      recentHistory.length > 0
        ? recentHistory
            .slice(0, 20) // Use top 20 for context
            .map(
              (t: {
                name: string
                merchantName: string | null
                amount: Prisma.Decimal
                category: { name: string } | null
                subcategory: { name: string } | null
              }) => {
                const amt = Math.abs(t.amount.toNumber()).toFixed(2)
                return `  - "${t.merchantName || t.name}" | $${amt} | ${t.category?.name || "N/A"}${t.subcategory ? ` > ${t.subcategory.name}` : ""}`
              },
            )
            .join("\n")
        : "  No recent history"

    const transactionAmount = Math.abs(transaction.amount.toNumber()).toFixed(2)
    const transactionType = transaction.amount.toNumber() > 0 ? "expense" : "income"

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

RECENT TRANSACTION HISTORY (last 2 months):
${historyContext}

INSTRUCTIONS:
1. Prioritize similar transactions - if there are transactions with the same merchant or description that have been categorized, use that pattern
2. Consider the transaction history to understand spending patterns
3. Use the Plaid category as a fallback reference
4. Consider the amount and transaction type (expense vs income)
5. Only assign a category if confidence > 60
6. If you can't match a subcategory but the category is clear, just use the category
7. Use exact category/subcategory names from the available categories list
8. Be conservative - when in doubt, return null values

Provide your categorization decision with confidence and reasoning.`

    // Call OpenAI using ai-sdk with structured output
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: CategorizationResultSchema,
      prompt,
    })

    const categorization = result.object

    // Log the result
    console.log(`🤖 AI Categorization for "${transaction.name}":`, {
      category: categorization.categoryName,
      subcategory: categorization.subcategoryName,
      confidence: categorization.confidence,
      reasoning: categorization.reasoning,
    })

    // If confidence is too low or no category suggested, return null
    if (!categorization.categoryName || categorization.confidence <= 60) {
      console.log(`⚠️  Low confidence (${categorization.confidence}), skipping auto-categorization`)
      return null
    }

    // Find the category and subcategory IDs
    const category = categories.find((c: { name: string }) => c.name === categorization.categoryName)
    if (!category) {
      console.error(`Category "${categorization.categoryName}" not found`)
      return null
    }

    const subcategory = categorization.subcategoryName
      ? category.subcategories.find((s: { name: string }) => s.name === categorization.subcategoryName)
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
