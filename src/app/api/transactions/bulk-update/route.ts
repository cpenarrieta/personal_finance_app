import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
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

    // Update all transactions with the new category/subcategory
    await prisma.transaction.updateMany({
      where: {
        id: {
          in: transactionIds,
        },
      },
      data: {
        categoryId: categoryId ?? undefined,
        subcategoryId: subcategoryId ?? undefined,
      },
    })

    // Handle tags if provided
    if (tagIds !== undefined) {
      // First, delete all existing tag associations for these transactions
      await prisma.transactionTag.deleteMany({
        where: {
          transactionId: {
            in: transactionIds,
          },
        },
      })

      // Then create new tag associations
      if (tagIds.length > 0) {
        const tagData = transactionIds.flatMap((transactionId) =>
          tagIds.map((tagId) => ({
            transactionId,
            tagId,
          })),
        )

        await prisma.transactionTag.createMany({
          data: tagData,
        })
      }
    }

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ updatedCount: transactionIds.length })
  } catch (error) {
    logError("Error bulk updating transactions:", error)
    return apiErrors.internalError("Failed to bulk update transactions")
  }
}
