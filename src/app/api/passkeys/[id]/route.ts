import { cookies } from "next/headers"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || ""

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get session cookie to forward to Better Auth
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("better-auth.session_token")

    if (!sessionCookie) {
      return apiErrors.unauthorized("Not authenticated")
    }

    // Call Better Auth's passkey delete endpoint
    const response = await fetch(`${CONVEX_SITE_URL}/api/auth/passkey/delete-passkey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `better-auth.session_token=${sessionCookie.value}`,
      },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete passkey: ${response.status}`)
    }

    return apiSuccess({ deleted: true })
  } catch (error) {
    logError("Failed to delete passkey:", error)
    return apiErrors.internalError("Failed to delete passkey")
  }
}
