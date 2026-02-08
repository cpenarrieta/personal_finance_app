import { apiSuccess, apiErrors } from "@/lib/api/response"
import { r2Client, R2_BUCKET } from "@/lib/r2/client"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const { person } = await request.json()
    if (!person) {
      return apiErrors.badRequest("person required")
    }

    const key = `registered_accounts/noa/${person}/${randomUUID()}.pdf`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: "application/pdf",
    })

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 })

    return apiSuccess({ presignedUrl, key })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return apiErrors.internalError("Failed to generate presigned URL")
  }
}
