import { NextRequest } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { bulkUpdateTransactionsSchema, safeParseRequestBody } from "@/types/api"
import { revalidateTag, revalidatePath } from "next/cache"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function PATCH(request: NextRequest) {
  try {
    // Validate request body with Zod
    const parseResult = await safeParseRequestBody(request, bulkUpdateTransactionsSchema)

    if (!parseResult.success) {
      return apiErrors.validationError("Invalid request data", parseResult.error.message)
    }

    const { transactionIds, categoryId, subcategoryId, tagIds } = parseResult.data

    // Update all transactions with the new category/subcategory and tags
    const result = await fetchMutation(api.transactions.bulkUpdateWithTags, {
      transactionIds: transactionIds as Id<"transactions">[],
      categoryId: categoryId !== undefined ? (categoryId as Id<"categories"> | null) : undefined,
      subcategoryId: subcategoryId !== undefined ? (subcategoryId as Id<"subcategories"> | null) : undefined,
      tagIds: tagIds ? (tagIds as Id<"tags">[]) : undefined,
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ updatedCount: result.updatedCount })
  } catch (error) {
    logError("Error bulk updating transactions:", error)
    return apiErrors.internalError("Failed to bulk update transactions")
  }
}
