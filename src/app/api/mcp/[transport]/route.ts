/**
 * MCP API Route
 * Handles MCP protocol requests via Streamable HTTP transport
 */

import { mcpHandler } from "@/lib/mcp/server"
import { NextRequest } from "next/server"

export const maxDuration = 60

// Generate unique request ID
let requestCounter = 0
function genReqId() {
  return `req-${++requestCounter}-${Date.now()}`
}

// Wrap handler with error logging
async function wrappedHandler(req: NextRequest) {
  const reqId = genReqId()

  // Try to read request body for debugging
  let bodyPreview = ""
  try {
    const clonedReq = req.clone()
    const text = await clonedReq.text()
    const parsed = JSON.parse(text)
    bodyPreview = parsed.method || "no-method"
  } catch {
    bodyPreview = "unparseable"
  }

  console.log(`[MCP Route ${reqId}] ${req.method} received, mcp-method: ${bodyPreview}`)

  try {
    const result = await mcpHandler(req)
    console.log(`[MCP Route ${reqId}] Completed, status: ${result.status}`)
    return result
  } catch (error) {
    console.error(`[MCP Route ${reqId}] Handler error:`, error)
    console.error(`[MCP Route ${reqId}] Error stack:`, error instanceof Error ? error.stack : "no stack")
    throw error
  }
}

export { wrappedHandler as GET, wrappedHandler as POST, wrappedHandler as DELETE }
