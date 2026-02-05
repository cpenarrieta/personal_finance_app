import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Better Auth session cookie names (with __Secure- prefix in production HTTPS)
const SESSION_COOKIE_NAME = "better-auth.session_token"
const SECURE_SESSION_COOKIE_NAME = "__Secure-better-auth.session_token"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow bypass for E2E tests when E2E_TEST_MODE is enabled
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
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|json)$/)
  ) {
    return NextResponse.next()
  }

  // Check for Better Auth session cookie (try both secure and non-secure names)
  // Cookie is encrypted - just check existence, Convex validates on actual queries
  const sessionCookie = request.cookies.get(SECURE_SESSION_COOKIE_NAME) || request.cookies.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Session cookie exists - allow through
  // ALLOWED_EMAILS validation happens in Convex queries via auth config
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - api/plaid/webhook (Plaid server-to-server webhook with custom verification)
     * - api/cron (cron jobs with CRON_SECRET verification)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: Public assets are filtered in the proxy function itself
     */
    "/((?!api/auth|api/plaid/webhook|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
}
