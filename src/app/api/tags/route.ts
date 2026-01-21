import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function GET() {
  try {
    const tags = await fetchQuery(api.tags.getAll)
    return apiSuccess(tags)
  } catch (error) {
    logError("Error fetching tags:", error)
    return apiErrors.internalError("Failed to fetch tags")
  }
}
