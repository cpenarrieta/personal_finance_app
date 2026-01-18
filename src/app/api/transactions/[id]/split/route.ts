import { NextRequest } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../../../convex/_generated/api"
import type { Id } from "../../../../../../convex/_generated/dataModel"
import { z } from "zod"
import { safeParseRequestBody } from "@/types/api"
import { revalidateTag, revalidatePath } from "next/cache"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

// Schema for split transaction request
const splitTransactionSchema = z.object({
  splits: z
    .array(
      z.object({
        amount: z
          .string()
          .or(z.number())
          .transform((val) => Number(val.toString())),
        categoryId: z.string().optional().nullable(),
        subcategoryId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        description: z.string().optional(), // Optional custom description for the split
      }),
    )
    .min(2, "At least 2 splits are required"),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate request body
    const parseResult = await safeParseRequestBody(req, splitTransactionSchema)

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

    // Validate that split amounts sum to original amount
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0)
    const originalAmount = originalTransaction.amount_number

    if (Math.abs(totalSplitAmount - originalAmount) > 0.01) {
      return apiErrors.validationError("Split amounts must sum to original transaction amount", {
        original: originalAmount.toString(),
        total: totalSplitAmount.toString(),
      })
    }

    // Perform the split
    const result = await fetchMutation(api.transactions.split, {
      id: id as Id<"transactions">,
      splits: splits.map((split) => ({
        amount: split.amount,
        categoryId: split.categoryId ? (split.categoryId as Id<"categories">) : undefined,
        subcategoryId: split.subcategoryId ? (split.subcategoryId as Id<"subcategories">) : undefined,
        notes: split.notes ?? undefined,
        description: split.description,
      })),
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ message: "Transaction split successfully", ...result })
  } catch (error) {
    logError("Error splitting transaction:", error)
    return apiErrors.internalError("Failed to split transaction")
  }
}
