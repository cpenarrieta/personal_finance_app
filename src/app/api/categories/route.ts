import { prisma } from "@/lib/db/prisma"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    return apiSuccess(categories)
  } catch (error) {
    logError("Error fetching categories:", error)
    return apiErrors.internalError("Failed to fetch categories")
  }
}
