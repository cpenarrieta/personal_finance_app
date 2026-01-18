import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function GET() {
  try {
    const categories = await fetchQuery(api.categories.getAll)
    return apiSuccess(categories)
  } catch (error) {
    logError("Error fetching categories:", error)
    return apiErrors.internalError("Failed to fetch categories")
  }
}
