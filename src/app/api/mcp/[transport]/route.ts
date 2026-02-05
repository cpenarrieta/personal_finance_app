/**
 * MCP API Route
 * Handles MCP protocol requests via Streamable HTTP transport
 */

import { mcpHandler } from "@/lib/mcp/server"
import { NextRequest } from "next/server"

export const maxDuration = 60

// Wrap handler with error logging
async function wrappedHandler(req: NextRequest, context: { params: Promise<{ transport: string }> }) {
  console.log("[MCP Route] Request received:", req.method, req.url)
  try {
    const result = await mcpHandler(req, context)
    console.log("[MCP Route] Request completed successfully")
    return result
  } catch (error) {
    console.error("[MCP Route] Handler error:", error)
    console.error("[MCP Route] Error stack:", error instanceof Error ? error.stack : "no stack")
    throw error
  }
}

export { wrappedHandler as GET, wrappedHandler as POST, wrappedHandler as DELETE }
