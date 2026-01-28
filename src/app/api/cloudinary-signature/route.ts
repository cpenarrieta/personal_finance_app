import { isAuthenticated } from "@/lib/auth/auth-server"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

/**
 * Generate Cloudinary upload signature
 * Ensures only authenticated users can upload files
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const authenticated = await isAuthenticated()

    if (!authenticated) {
      return apiErrors.unauthorized()
    }

    // Get upload parameters from request
    const body = await request.json()

    // Validate required env vars
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey = process.env.CLOUDINARY_API_KEY

    if (!apiSecret || !apiKey) {
      logError("Missing Cloudinary credentials")
      return apiErrors.internalError("Server configuration error")
    }

    // Build params string for signature
    // Cloudinary sends all params that need to be signed
    // We need to exclude api_key, resource_type, and cloud_name
    const paramsToSign: Record<string, any> = { ...body }
    delete paramsToSign.api_key
    delete paramsToSign.resource_type
    delete paramsToSign.cloud_name

    // Sort keys alphabetically and build signature string
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => {
        const value = paramsToSign[key]
        // If value is an array, join with comma
        const paramValue = Array.isArray(value) ? value.join(",") : value
        return `${key}=${paramValue}`
      })
      .join("&")

    // Generate SHA1 signature (Cloudinary uses SHA1, not SHA256)
    const crypto = await import("crypto")
    const signature = crypto
      .createHash("sha1")
      .update(sortedParams + apiSecret)
      .digest("hex")

    return apiSuccess({ signature })
  } catch (error) {
    logError("Error generating Cloudinary signature:", error)
    return apiErrors.internalError("Failed to generate signature")
  }
}
