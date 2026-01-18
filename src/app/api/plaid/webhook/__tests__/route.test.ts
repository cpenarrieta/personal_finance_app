/**
 * Unit tests for Plaid Webhook API endpoint
 *
 * Tests cover:
 * 1. Webhook verification
 * 2. Transaction webhook routing
 * 3. Item webhook routing
 * 4. Error handling
 */

import { NextRequest } from "next/server"
import { POST } from "../route"
import * as plaidModule from "@/lib/api/plaid"
import * as webhookHandlersModule from "@/lib/plaid/webhook-handlers"

// Mock modules at handler level (handlers use Convex internally)
jest.mock("@/lib/api/plaid")
jest.mock("@/lib/plaid/webhook-handlers")

describe("Plaid Webhook API", () => {
  const mockPlaidClient = {
    webhookVerificationKeyGet: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock getPlaidClient
    ;(plaidModule.getPlaidClient as jest.Mock) = jest.fn(() => mockPlaidClient)

    // Mock webhook handlers
    ;(webhookHandlersModule.handleTransactionWebhook as jest.Mock).mockResolvedValue(undefined)
    ;(webhookHandlersModule.handleItemWebhook as jest.Mock).mockResolvedValue(undefined)

    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation()
    jest.spyOn(console, "warn").mockImplementation()
    jest.spyOn(console, "error").mockImplementation()

    // Clear environment variables
    delete process.env.PLAID_WEBHOOK_VERIFICATION_KEY
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // Helper to create mock NextRequest
  const createMockRequest = (body: object, headers: Record<string, string> = {}) => {
    const bodyText = JSON.stringify(body)
    return {
      text: jest.fn().mockResolvedValue(bodyText),
      headers: {
        get: jest.fn((name: string) => headers[name.toLowerCase()] || null),
      },
    } as unknown as NextRequest
  }

  describe("Webhook Verification", () => {
    it("should reject webhook without Plaid-Verification header", async () => {
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Unauthorized")
    })

    it("should accept webhook with verification header when no secret is set", async () => {
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-verification-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.received).toBe(true)
    })

    it("should verify webhook with secret when PLAID_WEBHOOK_VERIFICATION_KEY is set", async () => {
      process.env.PLAID_WEBHOOK_VERIFICATION_KEY = "test-secret"
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }

      // Create a valid JWT-like token with kid in the header
      const jwtHeader = Buffer.from(JSON.stringify({ kid: "test-verification-key" })).toString("base64")
      const jwtPayload = Buffer.from(JSON.stringify({ test: "payload" })).toString("base64")
      const jwtSignature = "test-signature"
      const validJwt = `${jwtHeader}.${jwtPayload}.${jwtSignature}`

      const request = createMockRequest(webhookBody, {
        "plaid-verification": validJwt,
      })

      mockPlaidClient.webhookVerificationKeyGet.mockResolvedValue({
        data: { key: "valid-key" },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.received).toBe(true)
    })
  })

  describe("Transaction Webhooks", () => {
    it("should handle SYNC_UPDATES_AVAILABLE webhook", async () => {
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.received).toBe(true)
      expect(webhookHandlersModule.handleTransactionWebhook).toHaveBeenCalledWith(
        "SYNC_UPDATES_AVAILABLE",
        "test-plaid-item-id",
      )
    })

    it("should handle DEFAULT_UPDATE webhook", async () => {
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(webhookHandlersModule.handleTransactionWebhook).toHaveBeenCalledWith(
        "DEFAULT_UPDATE",
        "test-plaid-item-id",
      )
    })

    it("should skip transaction webhook if item_id is missing", async () => {
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        // No item_id
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(webhookHandlersModule.handleTransactionWebhook).not.toHaveBeenCalled()
    })
  })

  describe("Item Webhooks", () => {
    it("should handle ERROR item webhook", async () => {
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "ERROR",
        item_id: "test-plaid-item-id",
        error: {
          error_code: "ITEM_LOGIN_REQUIRED",
          error_message: "User needs to re-authenticate",
        },
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(webhookHandlersModule.handleItemWebhook).toHaveBeenCalledWith(
        "ERROR",
        "test-plaid-item-id",
        webhookBody.error,
        undefined,
      )
    })

    it("should handle PENDING_EXPIRATION item webhook", async () => {
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "PENDING_EXPIRATION",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(webhookHandlersModule.handleItemWebhook).toHaveBeenCalledWith(
        "PENDING_EXPIRATION",
        "test-plaid-item-id",
        undefined,
        undefined,
      )
    })

    it("should skip item webhook if item_id is missing", async () => {
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "ERROR",
        // No item_id
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(webhookHandlersModule.handleItemWebhook).not.toHaveBeenCalled()
    })
  })

  describe("Error Handling", () => {
    it("should return 200 with error when handler throws", async () => {
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      ;(webhookHandlersModule.handleTransactionWebhook as jest.Mock).mockRejectedValue(new Error("Handler error"))

      const response = await POST(request)
      const data = await response.json()

      // Webhooks return 200 even on error to prevent retries
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.received).toBe(true)
      expect(data.data.error).toBe("Handler error")
    })

    it("should handle malformed JSON gracefully", async () => {
      const request = {
        text: jest.fn().mockResolvedValue("invalid json"),
        headers: {
          get: jest.fn().mockReturnValue("test-key"),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.error).toBeDefined()
    })
  })

  describe("Unhandled Webhook Types", () => {
    it("should log unhandled webhook types", async () => {
      const webhookBody = {
        webhook_type: "UNKNOWN_TYPE",
        webhook_code: "SOME_CODE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(webhookHandlersModule.handleTransactionWebhook).not.toHaveBeenCalled()
      expect(webhookHandlersModule.handleItemWebhook).not.toHaveBeenCalled()
    })
  })
})
