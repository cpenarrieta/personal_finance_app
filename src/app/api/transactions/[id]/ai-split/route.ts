import { NextRequest } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../../../convex/_generated/api"
import type { Id } from "../../../../../../convex/_generated/dataModel"
import { z } from "zod"
import { safeParseRequestBody } from "@/types/api"
import { revalidateTag, revalidatePath } from "next/cache"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

// Schema for AI-generated split transaction request
const aiSplitSchema = z.object({
  categoryId: z.string(),
  subcategoryId: z.string().nullable(),
  amount: z.number().positive(),
  description: z.string(),
  reasoning: z.string().optional(),
})

const aiSplitTransactionSchema = z.object({
  splits: z.array(aiSplitSchema).min(1, "At least 1 split is required"),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate request body
    const parseResult = await safeParseRequestBody(req, aiSplitTransactionSchema)

    if (!parseResult.success) {
      return apiErrors.validationError("Invalid request data", parseResult.error.message)
    }

    const { splits } = parseResult.data

    // Fetch the original transaction
    const originalTransaction = await fetchQuery(api.transactions.getById, {
      id: id as Id<"transactions">,
    })

    if (!originalTransaction) {
      return apiErrors.notFound("Transaction")
    }

    // Check if transaction is already split
    if (originalTransaction.isSplit) {
      return apiErrors.badRequest("Transaction has already been split")
    }

    // Validate that split amounts sum to original amount (with tolerance for rounding)
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0)
    const originalAmount = Math.abs(originalTransaction.amount_number)
    const difference = Math.abs(totalSplitAmount - originalAmount)

    if (difference > 0.02) {
      return apiErrors.validationError("Split amounts must sum to original transaction amount", {
        original: originalAmount.toFixed(2),
        total: totalSplitAmount.toFixed(2),
        difference: difference.toFixed(2),
      })
    }

    // Perform the AI split
    const result = await fetchMutation(api.transactions.aiSplit, {
      id: id as Id<"transactions">,
      splits: splits.map((split) => ({
        categoryId: split.categoryId as Id<"categories">,
        subcategoryId: split.subcategoryId as Id<"subcategories"> | null,
        amount: split.amount,
        description: split.description,
        reasoning: split.reasoning,
      })),
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ message: "Transaction split successfully with AI suggestions", ...result })
  } catch (error) {
    logError("Error splitting transaction with AI:", error)
    return apiErrors.internalError("Failed to split transaction")
  }
}
