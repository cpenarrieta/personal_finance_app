import { apiSuccess, apiErrors } from "@/lib/api/response"
import { getR2DownloadUrl } from "@/lib/r2/client"

export async function POST(request: Request) {
  try {
    const { key } = await request.json()
    if (!key) return apiErrors.badRequest("key required")

    const downloadUrl = await getR2DownloadUrl(key)

    return apiSuccess({ downloadUrl })
  } catch (error) {
    console.error("Error generating download URL:", error)
    return apiErrors.internalError("Failed to generate download URL")
  }
}
