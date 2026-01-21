import { NextRequest } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { updateTransactionSchema } from "@/types/api"
import { safeParseRequestBody } from "@/types/api"
import { revalidateTag, revalidatePath } from "next/cache"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate request body with Zod
    const parseResult = await safeParseRequestBody(req, updateTransactionSchema)

    if (!parseResult.success) {
      return apiErrors.validationError("Invalid request data", parseResult.error.message)
    }

    const { name, amount, plaidCategory, plaidSubcategory, categoryId, subcategoryId, notes, tagIds, files } =
      parseResult.data

    // Update the transaction using Convex mutation
    await fetchMutation(api.transactions.updateWithTags, {
      id: id as Id<"transactions">,
      name,
      amount,
      plaidCategory,
      plaidSubcategory,
      categoryId: categoryId !== undefined ? (categoryId as Id<"categories"> | null) : undefined,
      subcategoryId: subcategoryId !== undefined ? (subcategoryId as Id<"subcategories"> | null) : undefined,
      notes,
      files,
      tagIds: tagIds ? (tagIds as Id<"tags">[]) : undefined,
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ id, updated: true })
  } catch (error) {
    logError("Error updating transaction:", error)
    return apiErrors.internalError("Failed to update transaction")
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Delete the transaction using Convex mutation
    await fetchMutation(api.transactions.remove, {
      id: id as Id<"transactions">,
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ deleted: true })
  } catch (error) {
    logError("Error deleting transaction:", error)

    if (error instanceof Error && error.message.includes("not found")) {
      return apiErrors.notFound("Transaction")
    }

    return apiErrors.internalError("Failed to delete transaction")
  }
}
