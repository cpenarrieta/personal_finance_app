import { prisma } from "@/lib/db/prisma"
import { CategoryGroupType } from "@prisma/generated"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body as {
      updates: Array<{ id: string; groupType: CategoryGroupType | null; displayOrder: number | null }>
    }

    if (!updates || !Array.isArray(updates)) {
      return apiErrors.badRequest("Invalid updates format")
    }

    // Update categories in a transaction
    await prisma.$transaction(
      updates.map((update) =>
        prisma.category.update({
          where: { id: update.id },
          data: {
            groupType: update.groupType,
            displayOrder: update.displayOrder,
          },
        }),
      ),
    )

    return apiSuccess({ updated: true })
  } catch (error) {
    logError("Error updating category order:", error)
    return apiErrors.internalError("Failed to update")
  }
}
