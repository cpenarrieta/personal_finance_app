import { NextRequest } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { revalidateTag, revalidatePath } from "next/cache"
import { logInfo, logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

/**
 * Updates item status after successful reauth (when item_id hasn't changed)
 * This endpoint is used when Link update mode successfully repairs login
 * without creating a new item (no public_token exchange needed)
 */
export async function POST(req: NextRequest) {
  try {
    const { itemId } = await req.json()

    if (!itemId) {
      return apiErrors.badRequest("itemId is required")
    }

    // Update item status to ACTIVE (login repaired)
    await fetchMutation(api.items.updateStatus, {
      id: itemId as Id<"items">,
      status: "ACTIVE",
    })

    // Invalidate caches so UI updates immediately
    revalidateTag("items", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    logInfo(`✅ Item ${itemId} status updated to ACTIVE (reauth successful)`)

    return apiSuccess({ updated: true })
  } catch (error) {
    logError("❌ Error updating item status:", error)
    return apiErrors.internalError(error instanceof Error ? error.message : "Unknown error")
  }
}
