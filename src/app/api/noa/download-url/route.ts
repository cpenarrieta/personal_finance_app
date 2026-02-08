import { apiSuccess, apiErrors } from "@/lib/api/response"
import { r2Client, R2_BUCKET } from "@/lib/r2/client"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function POST(request: Request) {
  try {
    const { key } = await request.json()
    if (!key) return apiErrors.badRequest("key required")

    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
    const downloadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

    return apiSuccess({ downloadUrl })
  } catch (error) {
    console.error("Error generating download URL:", error)
    return apiErrors.internalError("Failed to generate download URL")
  }
}
