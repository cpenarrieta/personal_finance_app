import { createAuthClient } from "better-auth/react"
import { passkeyClient } from "@better-auth/passkey/client"
import { convexClient } from "@convex-dev/better-auth/client/plugins"

// No baseURL needed - defaults to current origin (your site)
// Auth requests go to /api/auth/* which proxies to Convex
export const authClient = createAuthClient({
  plugins: [passkeyClient(), convexClient()],
})

export const { signIn, signOut, useSession } = authClient
