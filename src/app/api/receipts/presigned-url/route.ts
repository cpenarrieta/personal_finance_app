import { apiSuccess, apiErrors } from "@/lib/api/response"
import { r2Client, R2_BUCKET } from "@/lib/r2/client"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
}

export async function POST(request: Request) {
  try {
    const { transactionId, contentType } = await request.json()

    if (!transactionId) return apiErrors.badRequest("transactionId required")
    if (!contentType || !ALLOWED_TYPES[contentType]) {
      return apiErrors.badRequest("Invalid contentType. Allowed: " + Object.keys(ALLOWED_TYPES).join(", "))
    }

    const ext = ALLOWED_TYPES[contentType]
    const key = `receipts/${transactionId}/${randomUUID()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 })

    return apiSuccess({ presignedUrl, key })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return apiErrors.internalError("Failed to generate presigned URL")
  }
}
