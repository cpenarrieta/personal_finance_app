/**
 * AI-powered receipt analysis using OpenAI Vision
 * Extracts line items, categories, merchant, and total from receipt images/PDFs
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for a single line item on a receipt
const ReceiptLineItemSchema = z.object({
  description: z.string().describe("Item description from the receipt"),
  amount: z.number().describe("Item amount in dollars (always positive)"),
  suggestedCategory: z.string().describe("Suggested category name for this item"),
  suggestedSubcategory: z.string().nullable().describe("Suggested subcategory name, or null if not applicable"),
})

// Schema for the complete receipt analysis
const ReceiptAnalysisSchema = z.object({
  merchantName: z.string().describe("Name of the merchant/store"),
  totalAmount: z.number().describe("Total amount on receipt (always positive)"),
  receiptDate: z.string().nullable().describe("Date on receipt in ISO format (YYYY-MM-DD), or null if not found"),
  lineItems: z.array(ReceiptLineItemSchema).describe("Individual line items from the receipt"),
  confidence: z.number().min(0).max(100).describe("Confidence score for the analysis (0-100)"),
  reasoning: z.string().describe("Brief explanation of the analysis"),
})

export type ReceiptLineItem = z.infer<typeof ReceiptLineItemSchema>
export type ReceiptAnalysis = z.infer<typeof ReceiptAnalysisSchema>

/**
 * Analyze a receipt image using OpenAI Vision
 * @param imageDataUrl - Base64 data URL of the image (data:image/jpeg;base64,...)
 * @param availableCategories - List of available categories to help with categorization
 */
export async function analyzeReceiptImage(
  imageDataUrl: string,
  availableCategories: Array<{ name: string; subcategories: Array<{ name: string }> }>,
): Promise<ReceiptAnalysis> {
  try {
    // Build context about available categories
    const categoriesContext = availableCategories
      .map((cat) => {
        const subs = cat.subcategories.map((s) => s.name).join(", ")
        return `${cat.name}: [${subs || "no subcategories"}]`
      })
      .join("\n")

    const prompt = `You are a receipt analysis expert. Analyze this receipt image and extract the following information:

1. Merchant name
2. Total amount (in dollars)
3. Receipt date (if visible)
4. Individual line items with descriptions and amounts
5. Suggested category for each line item

AVAILABLE CATEGORIES:
${categoriesContext}

INSTRUCTIONS:
- Extract ALL line items from the receipt (not just the total)
- For each line item, suggest the most appropriate category and subcategory from the available list
- Use exact category/subcategory names from the available categories
- If you can't determine a category with confidence, use your best judgment
- All amounts should be positive numbers
- Be thorough and extract all items, even small ones
- If the receipt has grouped items (e.g., "Groceries"), try to break them down if individual items are visible
- Provide a confidence score based on image quality and clarity

Example line items:
- "Organic Bananas" → Food & Drink > Groceries
- "LEGO Star Wars Set" → Shopping > Toys & Games
- "Dove Body Wash" → Shopping > Health & Beauty

Analyze the receipt and provide structured output.`

    const result = await generateObject({
      model: openai("gpt-4o"), // Using gpt-4o for vision capabilities
      schema: ReceiptAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image",
              image: imageDataUrl,
            },
          ],
        },
      ],
    })

    const analysis = result.object

    console.log(`🧾 Receipt Analysis:`, {
      merchant: analysis.merchantName,
      total: analysis.totalAmount,
      itemCount: analysis.lineItems.length,
      confidence: analysis.confidence,
    })

    return analysis
  } catch (error) {
    console.error("Error analyzing receipt:", error)
    throw error
  }
}

/**
 * Match receipt categories to actual category IDs in the database
 * @param lineItems - Line items with suggested category names
 * @param availableCategories - Full category list with IDs
 */
export function matchCategoriesToIds(
  lineItems: ReceiptLineItem[],
  availableCategories: Array<{ id: string; name: string; subcategories: Array<{ id: string; name: string }> }>,
): Array<{
  description: string
  amount: number
  categoryId: string | null
  subcategoryId: string | null
}> {
  return lineItems.map((item) => {
    // Find matching category (case-insensitive)
    const category = availableCategories.find(
      (c) => c.name.toLowerCase() === item.suggestedCategory.toLowerCase(),
    )

    if (!category) {
      console.warn(`Category "${item.suggestedCategory}" not found for item "${item.description}"`)
      return {
        description: item.description,
        amount: item.amount,
        categoryId: null,
        subcategoryId: null,
      }
    }

    // Find matching subcategory (case-insensitive)
    const subcategory = item.suggestedSubcategory
      ? category.subcategories.find((s) => s.name.toLowerCase() === item.suggestedSubcategory!.toLowerCase())
      : null

    if (item.suggestedSubcategory && !subcategory) {
      console.warn(
        `Subcategory "${item.suggestedSubcategory}" not found in category "${category.name}" for item "${item.description}"`,
      )
    }

    return {
      description: item.description,
      amount: item.amount,
      categoryId: category.id,
      subcategoryId: subcategory?.id || null,
    }
  })
}
