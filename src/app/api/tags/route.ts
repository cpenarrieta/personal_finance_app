import { prisma } from "@/lib/db/prisma"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
    })

    return apiSuccess(tags)
  } catch (error) {
    logError("Error fetching tags:", error)
    return apiErrors.internalError("Failed to fetch tags")
  }
}
