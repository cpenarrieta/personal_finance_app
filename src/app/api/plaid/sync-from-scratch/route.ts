import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import { syncAllItems } from "@/lib/sync/sync"
import { apiSuccess, apiError } from "@/lib/api/response"

export async function POST() {
  try {
    // Clear all cursors
    await fetchMutation(api.items.clearAllCursors, {})

    // Run full sync
    await syncAllItems()

    return apiSuccess({ synced: true })
  } catch (error: any) {
    const errorCode = error.response?.data?.error_code
    const errorMessage = error.response?.data?.error_message || error.message
    const status = errorCode === "ITEM_LOGIN_REQUIRED" ? 401 : 500

    return apiError(errorMessage, status, errorCode || "SYNC_ERROR")
  }
}
