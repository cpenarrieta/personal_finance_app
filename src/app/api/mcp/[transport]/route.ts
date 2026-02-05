/**
 * MCP API Route
 * Handles MCP protocol requests via Streamable HTTP transport
 */

import { mcpHandler } from "@/lib/mcp/server"

export const maxDuration = 60

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE }
