import { createAuthClient } from "better-auth/react"
import { passkeyClient } from "@better-auth/passkey/client"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  plugins: [passkeyClient()],
})

export const { signIn, signOut, useSession } = authClient
