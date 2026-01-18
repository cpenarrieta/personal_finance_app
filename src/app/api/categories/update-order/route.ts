import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

type GroupType = "EXPENSES" | "INCOME" | "INVESTMENT" | "TRANSFER" | null

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body as {
      updates: Array<{ id: string; groupType: GroupType; displayOrder: number | null }>
    }

    if (!updates || !Array.isArray(updates)) {
      return apiErrors.badRequest("Invalid updates format")
    }

    // Convert to Convex format and call mutation
    await fetchMutation(api.categories.updateOrder, {
      updates: updates.map((update) => ({
        id: update.id as Id<"categories">,
        groupType: update.groupType,
        displayOrder: update.displayOrder ?? undefined,
      })),
    })

    return apiSuccess({ updated: true })
  } catch (error) {
    logError("Error updating category order:", error)
    return apiErrors.internalError("Failed to update")
  }
}
