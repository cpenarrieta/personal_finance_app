/**
 * MCP Authentication
 * Simple API key validation for MCP endpoints
 */

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"

/**
 * Verify API key from request headers
 * Returns AuthInfo if valid, undefined if invalid
 */
export async function verifyApiKey(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
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
    return undefined
  }

  if (bearerToken !== expectedKey) {
    return undefined
  }

  return {
    token: bearerToken,
    scopes: ["read:transactions", "read:accounts"],
    clientId: "mcp-client",
  }
}
