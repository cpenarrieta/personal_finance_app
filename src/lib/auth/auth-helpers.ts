import { auth } from "./auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    return session
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

export async function requireAuth() {
  const session = await getSession()

  if (!session || !session.user) {
    redirect("/login")
  }

  return session
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

  if (!isEmailAllowed(session.user.email)) {
    // User is not authorized - sign them out and redirect
    redirect("/login?error=unauthorized")
  }

  return session
}

/**
 * Gets the current user's ID from the session
 * Requires authentication - redirects to login if not authenticated
 * @returns The current user's ID
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await requireAuth()
  return session.user.id
}

/**
 * Gets the current user's ID from the session for API routes
 * Does not redirect - returns null if not authenticated
 * @param headers Request headers
 * @returns The current user's ID or null if not authenticated
 */
export async function getCurrentUserIdFromHeaders(
  headers: Headers,
): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers })
    return session?.user?.id || null
  } catch (error) {
    console.error("Error getting session from headers:", error)
    return null
  }
}
