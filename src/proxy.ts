import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./lib/auth/auth"
import { isEmailAllowed, getAllowedEmails } from "./lib/auth/auth-helpers"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ⚠️ SECURITY: Only enable E2E_TEST_MODE in controlled test environments
  // Never set E2E_TEST_MODE=true in production!
  // This allows Playwright tests to run without authentication
  if (process.env.E2E_TEST_MODE === "true") {
    const bypassHeader = request.headers.get("x-e2e-bypass-auth")
    if (bypassHeader === "true") {
      return NextResponse.next()
    }
  }

  // Allow access to auth API routes, login page, and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // Check for session using Better Auth
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Validate allowed email
    const allowedEmails = getAllowedEmails()

    if (allowedEmails.length === 0) {
      console.error("ALLOWED_EMAILS not configured")
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url))
    }

    if (!isEmailAllowed(session.user.email)) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url))
    }

    // All checks passed
    return NextResponse.next()
  } catch (error) {
    console.error("Proxy auth error:", error)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
