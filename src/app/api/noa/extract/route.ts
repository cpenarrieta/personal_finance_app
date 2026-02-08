import { apiSuccess, apiErrors } from "@/lib/api/response"
import { r2Client, R2_BUCKET } from "@/lib/r2/client"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { extractNoaData } from "@/lib/ai/extract-noa"

export async function POST(request: Request) {
  try {
    const { key } = await request.json()
    if (!key) return apiErrors.badRequest("key required")

    // Generate presigned URL for the LLM to read the PDF
    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
    const pdfUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 })

    // Send PDF URL directly to LLM for extraction
    const extracted = await extractNoaData(pdfUrl)

    return apiSuccess(extracted)
  } catch (error) {
    console.error("Error extracting NOA:", error)
    return apiErrors.internalError("Failed to extract NOA data")
  }
}
