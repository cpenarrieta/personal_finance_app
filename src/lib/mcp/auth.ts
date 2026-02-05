/**
 * MCP Authentication
 * Simple API key validation for MCP endpoints
 */

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"

// Log to help debug auth issues
console.log("[MCP Auth] Module loaded", {
  hasMcpApiKey: !!process.env.MCP_API_KEY,
  keyLength: process.env.MCP_API_KEY?.length,
})

/**
 * Verify API key from request headers
 * Returns AuthInfo if valid, undefined if invalid
 */
export async function verifyApiKey(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  console.log("[MCP Auth] verifyApiKey called", {
    hasBearerToken: !!bearerToken,
    tokenLength: bearerToken?.length,
  })

  const expectedKey = process.env.MCP_API_KEY

  // // If no API key configured, allow all requests (dev mode)
  // if (!expectedKey) {
  //   return {
  //     token: "dev-mode",
  //     scopes: ["read:transactions", "read:accounts"],
  //     clientId: "dev-client",
  //   }
  // }

  if (!bearerToken) {
    console.log("[MCP Auth] No bearer token provided")
    return undefined
  }

  if (bearerToken !== expectedKey) {
    console.log("[MCP Auth] Token mismatch", {
      expectedLength: expectedKey?.length,
      receivedLength: bearerToken.length,
    })
    return undefined
  }

  console.log("[MCP Auth] Auth successful")
  return {
    token: bearerToken,
    scopes: ["read:transactions", "read:accounts"],
    clientId: "mcp-client",
  }
}
