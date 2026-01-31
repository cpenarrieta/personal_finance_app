import { NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { apiSuccess, apiErrors } from "@/lib/api/response"
import { logInfo, logError } from "@/lib/utils/logger"
import { syncStockPrices } from "@/lib/sync/sync-prices"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logError("Invalid cron secret", { authHeader: authHeader?.slice(0, 20) })
    return apiErrors.unauthorized("Invalid cron secret")
  }

  try {
    logInfo("Starting stock price sync cron job")
    await syncStockPrices()

    revalidateTag("holdings", "max")
    revalidateTag("investments", "max")

    logInfo("Stock price sync cron job completed")
    return apiSuccess({ message: "Stock prices synced" })
  } catch (error) {
    logError("Stock price sync cron job failed", error)
    return apiErrors.internalError("Failed to sync stock prices")
  }
}
