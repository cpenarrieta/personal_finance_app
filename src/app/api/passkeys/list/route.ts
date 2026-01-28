import { cookies } from "next/headers"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || ""

export async function GET() {
  try {
    // Get session cookie to forward to Better Auth
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("better-auth.session_token")

    if (!sessionCookie) {
      return apiErrors.unauthorized("Not authenticated")
    }

    // Call Better Auth's passkey list endpoint
    const response = await fetch(`${CONVEX_SITE_URL}/api/auth/passkey/list-user-passkeys`, {
      method: "GET",
      headers: {
        Cookie: `better-auth.session_token=${sessionCookie.value}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch passkeys: ${response.status}`)
    }

    const data = await response.json()
    return apiSuccess({ passkeys: data.passkeys || [] })
  } catch (error) {
    logError("Failed to list passkeys:", error)
    return apiErrors.internalError("Failed to list passkeys")
  }
}
