import { betterAuth } from "better-auth"
import { passkey } from "@better-auth/passkey"
import { createClient, type CreateAuth } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { components } from "./_generated/api"
import authConfig from "./auth.config"
import type { DataModel } from "./_generated/dataModel"
import type { GenericCtx } from "@convex-dev/better-auth"

// Site URL for auth - points to Next.js app (auth is proxied to Convex)
const siteUrl = process.env.SITE_URL || "http://localhost:3000"

// Parse ALLOWED_EMAILS environment variable
function getAllowedEmails(): string[] {
  const allowedEmailEnv = process.env.ALLOWED_EMAILS
  if (!allowedEmailEnv) return []
  return allowedEmailEnv
    .split(",")
    .map((email) => email.toLowerCase().trim())
    .filter((email) => email.length > 0)
}

function isEmailAllowed(email: string | null | undefined): boolean {
  const allowedEmails = getAllowedEmails()
  if (allowedEmails.length === 0) return false
  if (!email) return false
  return allowedEmails.includes(email.toLowerCase().trim())
}

// Create the auth component client
export const authComponent = createClient<DataModel>(components.betterAuth)

// Create auth factory - called per-request with Convex context
export const createAuth: CreateAuth<DataModel> = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    database: authComponent.adapter(ctx),
    // baseURL is YOUR site - the /api/auth/[...all] handler proxies to Convex
    baseURL: siteUrl,
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET || "secret",
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      },
    },
    // Validate allowed emails - block unauthorized users from creating accounts
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isEmailAllowed(user.email)) {
              throw new Error("Email not authorized to access this application")
            }
            return { data: user }
          },
        },
      },
    },
    plugins: [
      // Only the convex plugin - no crossDomain needed since auth stays on same domain
      convex({ authConfig }),
      passkey({
        rpName: "Personal Finance App",
        rpID: siteUrl.includes("localhost") ? "localhost" : new URL(siteUrl).hostname,
        origin: siteUrl,
      }),
    ],
  })

// Export the getAuthUser query for client-side auth boundary
export const { getAuthUser } = authComponent.clientApi()
