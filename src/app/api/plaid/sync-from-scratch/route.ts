import { syncAllItems } from "@/lib/sync/sync"
import { prisma } from "@/lib/db/prisma"
import { apiSuccess, apiError } from "@/lib/api/response"

export async function POST() {
  try {
    // Clear all cursors
    await prisma.item.updateMany({
      data: {
        lastTransactionsCursor: null,
        lastInvestmentsCursor: null,
      },
    })

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
