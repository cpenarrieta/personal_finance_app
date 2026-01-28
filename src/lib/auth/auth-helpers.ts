import { redirect } from "next/navigation"
import { isAuthenticated, getToken } from "./auth-server"
import { decodeJwt } from "jose"

export async function getSession() {
  const token = await getToken()
  if (!token) {
    return null
  }
  // For backwards compat, return minimal session structure with user data
  try {
    const payload = decodeJwt(token)
    return {
      token,
      user: {
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        id: payload.sub as string | undefined,
      },
    }
  } catch {
    return { token }
  }
}

export async function requireAuth() {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect("/login")
  }

  const session = await getSession()
  return session || { authenticated: true }
}

/**
 * Parses ALLOWED_EMAILS environment variable into an array of allowed emails.
 * Supports both single email and comma-separated list of emails.
 * @returns Array of normalized (lowercased, trimmed) email addresses
 */
export function getAllowedEmails(): string[] {
  const allowedEmailEnv = process.env.ALLOWED_EMAILS

  if (!allowedEmailEnv) {
    return []
  }

  return allowedEmailEnv
    .split(",")
    .map((email) => email.toLowerCase().trim())
    .filter((email) => email.length > 0)
}

/**
 * Checks if the given email is in the list of allowed emails.
 * @param userEmail The email to check
 * @returns true if the email is allowed, false otherwise
 */
export function isEmailAllowed(userEmail: string | null | undefined): boolean {
  const allowedEmails = getAllowedEmails()

  if (allowedEmails.length === 0) {
    return false
  }

  if (!userEmail) {
    return false
  }

  const normalizedUserEmail = userEmail.toLowerCase().trim()
  return allowedEmails.includes(normalizedUserEmail)
}

export async function validateAllowedEmail() {
  const session = await requireAuth()

  const allowedEmails = getAllowedEmails()

  if (allowedEmails.length === 0) {
    throw new Error("ALLOWED_EMAILS not configured")
  }

  const userEmail = session && "user" in session ? session.user?.email : undefined
  if (!isEmailAllowed(userEmail)) {
    // User is not authorized - sign them out and redirect
    redirect("/login?error=unauthorized")
  }

  return session
}
