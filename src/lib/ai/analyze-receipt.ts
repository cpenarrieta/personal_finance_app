/**
 * AI-powered receipt analysis for smart transaction splitting
 * Uses OpenAI vision capabilities to analyze receipt images/PDFs
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import type { CoreMessage } from "ai"
import { categorizeTransactions } from "@/lib/ai/categorize-transaction"

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for a single split suggestion
const SplitSuggestionSchema = z.object({
  categoryName: z.string().describe("The category name for this group of items"),
  subcategoryName: z.string().nullable().describe("The subcategory name, or null if not specific enough"),
  amount: z.number().positive().describe("Total amount for this category group (must be positive)"),
  itemsSummary: z.string().describe("Brief summary of items in this group (e.g., 'Apples, Bread, Milk')"),
  confidence: z.number().min(0).max(100).describe("Confidence score from 0-100 for this categorization"),
})

// Schema for AI response - array of grouped splits
const ReceiptAnalysisResultSchema = z.object({
  splits: z
    .array(SplitSuggestionSchema)
    .min(2)
    .describe("Array of suggested splits, grouped by category. Must have at least 2 splits."),
  totalAmount: z.number().positive().describe("Sum of all split amounts (for validation)"),
  reasoning: z.string().describe("Brief explanation of how items were grouped"),
})

export type ReceiptAnalysisResult = z.infer<typeof ReceiptAnalysisResultSchema>
export type SplitSuggestion = z.infer<typeof SplitSuggestionSchema>

/**
 * Analyze receipt files using AI vision to suggest grouped transaction splits
 */
export async function analyzeReceiptForSplits(transactionId: string): Promise<ReceiptAnalysisResult | null> {
  try {
    // Fetch the transaction with files
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        name: true,
        merchantName: true,
        amount: true,
        files: true,
      },
    })

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`)
    }

    if (!transaction.files || transaction.files.length === 0) {
      throw new Error("No files attached to this transaction")
    }

    // Get absolute amount (receipts show positive amounts)
    const transactionAmount = Math.abs(transaction.amount.toNumber())

    // Fetch all available categories for context
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
      },
      orderBy: { displayOrder: "asc" },
    })

    // Build categories context for the AI
    const categoriesContext = categories
      .map((cat: { name: string; subcategories: Array<{ name: string }> }) => {
        const subs = cat.subcategories.map((s: { name: string }) => s.name).join(", ")
        return `${cat.name}: [${subs || "no subcategories"}]`
      })
      .join("\n")

    // Build prompt for AI
    const prompt = `You are a financial receipt analysis expert. Analyze the attached receipt image(s) and suggest how to split this transaction into category groups.

TRANSACTION DETAILS:
  Name: ${transaction.name}
  Merchant: ${transaction.merchantName || "N/A"}
  Total Amount: $${transactionAmount.toFixed(2)}

AVAILABLE CATEGORIES:
${categoriesContext}

CRITICAL INSTRUCTIONS:
1. **Group items by category** - Do NOT create a split for every line item
2. **Aggregate amounts** - Sum all items that belong to the same category
3. Read ALL line items on the receipt carefully
4. If receipt has 10 items but only 3 categories, create exactly 3 splits (one per category)
5. The sum of all split amounts MUST equal exactly $${transactionAmount.toFixed(2)}
6. Use exact category/subcategory names from the available categories list
7. Only suggest subcategory if items clearly fit (otherwise use null)
8. Provide at least 2 splits (if only 1 category found, return null - no split needed)

EXAMPLE:
Receipt with 5 items: Apples ($5), Bread ($5), Milk ($10), Soap ($15), Detergent ($15)
Expected Output:
- Split 1: Food, $20, "Apples, Bread, Milk"
- Split 2: Household, $30, "Soap, Detergent"
(NOT 5 separate splits!)

Analyze the receipt and provide your grouped split suggestions.`

    // Create vision content array with all file URLs
    const contentParts: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string | URL }
    > = [
      {
        type: "text",
        text: prompt,
      },
    ]

    // Add all receipt images/PDFs to the content
    for (const fileUrl of transaction.files) {
      contentParts.push({
        type: "image",
        image: fileUrl,
      })
    }

    // Call OpenAI using vision model with structured output
    const result = await generateObject({
      model: openai("gpt-4o"), // Vision model for image analysis
      schema: ReceiptAnalysisResultSchema,
      messages: [
        {
          role: "user",
          content: contentParts,
        } as CoreMessage,
      ],
    })

    const analysis = result.object

    // Validate that splits sum to transaction amount (with 1 cent tolerance for rounding)
    const splitSum = analysis.splits.reduce((sum, split) => sum + split.amount, 0)
    const difference = Math.abs(splitSum - transactionAmount)

    if (difference > 0.01) {
      console.error(
        `❌ Split validation failed: Sum $${splitSum.toFixed(2)} != Transaction $${transactionAmount.toFixed(2)}`,
      )
      throw new Error(
        `Split amounts ($${splitSum.toFixed(2)}) do not match transaction total ($${transactionAmount.toFixed(2)})`,
      )
    }

    // Validate that total amount matches
    const totalDifference = Math.abs(analysis.totalAmount - transactionAmount)
    if (totalDifference > 0.01) {
      console.warn(
        `⚠️  Reported total $${analysis.totalAmount} differs from transaction $${transactionAmount}, using calculated sum`,
      )
      analysis.totalAmount = splitSum
    }

    console.log(`✅ Receipt analysis for "${transaction.name}":`, {
      splits: analysis.splits.map((s) => ({
        category: s.categoryName,
        subcategory: s.subcategoryName,
        amount: s.amount,
        items: s.itemsSummary,
      })),
      total: analysis.totalAmount,
      reasoning: analysis.reasoning,
    })

    return analysis
  } catch (error) {
    console.error("Error analyzing receipt:", error)
    throw error
  }
}

/**
 * Apply the AI-suggested splits to create child transactions
 * Uses the same AI categorization logic as webhook transactions
 */
export async function applySplitSuggestions(
  transactionId: string,
  splits: Array<{
    categoryName: string
    subcategoryName: string | null
    amount: number
    itemsSummary: string
  }>,
): Promise<void> {
  try {
    // Fetch the parent transaction
    const parentTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        amount: true,
        datetime: true,
        date: true,
        accountId: true,
        isoCurrencyCode: true,
        merchantName: true,
        name: true,
      },
    })

    if (!parentTransaction) {
      throw new Error(`Transaction ${transactionId} not found`)
    }

    // Note: amount is stored as negative for expenses, but split.amount is positive
    const isExpense = parentTransaction.amount.toNumber() < 0

    // Create child transactions WITHOUT categories first
    // We'll use AI categorization (same as webhook) to assign categories
    const childTransactionPromises = splits.map(async (split, index) => {
      const childAmount = isExpense ? -split.amount : split.amount

      return prisma.transaction.create({
        data: {
          plaidTransactionId: `${parentTransaction.id}-split-${index + 1}`,
          accountId: parentTransaction.accountId,
          amount: childAmount,
          isoCurrencyCode: parentTransaction.isoCurrencyCode,
          date: parentTransaction.date,
          datetime: parentTransaction.datetime,
          pending: false,
          merchantName: parentTransaction.merchantName,
          // Use item summary as transaction name (helps AI categorization)
          name: `${parentTransaction.name} - ${split.itemsSummary}`,
          // Receipt analysis suggested category (for reference in notes)
          notes: `Smart Split: ${split.itemsSummary}\nSuggested category: ${split.categoryName}${split.subcategoryName ? ` > ${split.subcategoryName}` : ""}`,
          isSplit: false,
          isManual: true,
          parentTransactionId: parentTransaction.id,
          // No categoryId or subcategoryId - will be set by AI categorization
        },
      })
    })

    const createdTransactions = await Promise.all(childTransactionPromises)

    // Mark parent transaction as split
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        isSplit: true,
      },
    })

    console.log(`✅ Created ${createdTransactions.length} child transactions for split ${transactionId}`)

    // Apply AI categorization to all child transactions using bulk categorization
    // This uses the SAME logic as webhook transactions, optimized for multiple transactions
    // Pre-fetches categories and history once for better performance
    console.log(`🤖 Starting AI categorization for ${createdTransactions.length} split transaction(s)...`)

    const transactionIds = createdTransactions.map((t) => t.id)
    await categorizeTransactions(transactionIds, false)

    console.log(`✅ AI categorization complete for all splits`)
  } catch (error) {
    console.error("Error applying split suggestions:", error)
    throw error
  }
}
