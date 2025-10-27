import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import {
  CategoryWithSubcategories,
  TransactionWithRelations,
} from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface CategoryMatch {
  categoryName: string | null;
  subcategoryName: string | null;
  confidence: number;
  reasoning: string;
}

async function categorizeBatch(
  transactions: Array<{
    id: string;
    name: string;
    merchantName: string | null;
    plaidCategory: string | null;
    plaidSubcategory: string | null;
    notes: string | null;
    amount: string;
  }>,
  categories: Array<{
    id: string;
    name: string;
    subcategories: Array<{ id: string; name: string }>;
  }>
): Promise<Map<string, CategoryMatch>> {
  const categoriesStr = categories
    .map((cat) => {
      const subs = cat.subcategories.map((s) => s.name).join(", ");
      return `${cat.name}: [${subs}]`;
    })
    .join("\n");

  const transactionsStr = transactions
    .map((t, idx) => {
      const amount = Number(t.amount);
      const type = amount > 0 ? "expense" : "income";
      return `[${idx}] "${t.name}" | Merchant: ${
        t.merchantName || "N/A"
      } | Amount: $${Math.abs(amount).toFixed(2)} (${type}) | Plaid: ${
        t.category || "N/A"
      }/${t.subcategory || "N/A"} | Notes: ${t.notes || "N/A"}`;
    })
    .join("\n");

  const prompt = `You are a financial transaction categorizer. Given the following custom categories and transactions, categorize each transaction.

CATEGORIES:
${categoriesStr}

TRANSACTIONS:
${transactionsStr}

For each transaction, respond with a JSON array where each object has:
- transactionIndex: number (0-based index from the list above)
- categoryName: string (exact category name including emoji) or null
- subcategoryName: string (exact subcategory name) or null
- confidence: number (0-100, only assign if >50)
- reasoning: string (brief explanation)

IMPORTANT RULES:
1. Prioritize "Notes" field if available - it often has user context
2. Only assign a category if confidence > 50
3. If you can't match a subcategory but the category is clear, just use the category
4. Use exact names from the category list (including emojis)
5. Consider transaction type (income vs expense) when categorizing
6. Be conservative - when in doubt, return null

Return ONLY the JSON array, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a financial transaction categorization assistant. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content);
    const results = parsed.results || parsed.transactions || parsed;

    if (!Array.isArray(results)) {
      throw new Error("Response is not an array");
    }

    const matchMap = new Map<string, CategoryMatch>();
    results.forEach(
      (result: {
        transactionIndex: number;
        categoryName: string;
        subcategoryName: string;
        confidence: number;
        reasoning: string;
      }) => {
        const txId = transactions[result.transactionIndex]?.id;
        if (txId) {
          matchMap.set(txId, {
            categoryName: result.categoryName,
            subcategoryName: result.subcategoryName,
            confidence: result.confidence || 0,
            reasoning: result.reasoning || "",
          });
        }
      }
    );

    return matchMap;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return new Map();
  }
}

export async function POST() {
  try {
    // Fetch all categories with subcategories
    const categories = (await prisma.category.findMany({
      include: {
        subcategories: true,
      },
    })) as CategoryWithSubcategories[];

    // Fetch ALL transactions (no filter for existing categories)
    const transactions = (await prisma.transaction.findMany({
      select: {
        id: true,
        name: true,
        merchantName: true,
        plaidCategory: true,
        plaidSubcategory: true,
        notes: true,
        amount: true,
      },
    })) as TransactionWithRelations[];

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No transactions to categorize",
        categorized: 0,
        skipped: 0,
      });
    }

    let categorized = 0;
    let skipped = 0;

    // Process in batches of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(
        i,
        Math.min(i + BATCH_SIZE, transactions.length)
      );

      const batchData = batch.map((t) => ({
        id: t.id,
        name: t.name,
        merchantName: t.merchantName,
        plaidCategory: t.plaidCategory,
        plaidSubcategory: t.plaidSubcategory,
        notes: t.notes,
        amount: t.amount.toString(),
      }));

      const matches = await categorizeBatch(batchData, categories);

      for (const transaction of batch) {
        const match = matches.get(transaction.id);

        if (!match || match.confidence <= 50 || !match.categoryName) {
          skipped++;
          continue;
        }

        const category = categories.find((c) => c.name === match.categoryName);
        if (!category) {
          skipped++;
          continue;
        }

        const subcategory = match.subcategoryName
          ? category.subcategories.find((s) => s.name === match.subcategoryName)
          : null;

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            category: { connect: { id: category.id } },
            subcategory: subcategory
              ? { connect: { id: subcategory.id } }
              : { disconnect: true },
          },
        });

        categorized++;
      }

      // Small delay between batches
      if (i + BATCH_SIZE < transactions.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Re-categorized ${categorized} transactions (overwrote existing)`,
      total: transactions.length,
      categorized,
      skipped,
    });
  } catch (error) {
    console.error("Categorization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to categorize transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
