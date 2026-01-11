import { NextRequest } from "next/server"
import { generateAndStoreWeeklySummary } from "@/lib/ai/executive-summary"
import { revalidateTag } from "next/cache"
import { logInfo, logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets CRON_SECRET automatically)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logError("Invalid cron secret", { authHeader: authHeader?.slice(0, 20) })
    return apiErrors.unauthorized("Invalid cron secret")
  }

  try {
    logInfo("Starting weekly summary cron job")

    const result = await generateAndStoreWeeklySummary()

    if (!result) {
      return apiSuccess({ message: "Skipped - no transactions", id: null })
    }

    // Invalidate dashboard cache so users see new summary
    revalidateTag("weekly-summary", "max")
    revalidateTag("dashboard", "max")

    logInfo("Weekly summary cron job completed", { id: result.id })

    return apiSuccess({ message: "Summary generated", id: result.id })
  } catch (error) {
    logError("Weekly summary cron job failed", error)
    return apiErrors.internalError("Failed to generate weekly summary")
  }
}
