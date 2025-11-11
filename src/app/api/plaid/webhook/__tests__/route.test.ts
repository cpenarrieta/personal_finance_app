/**
 * Unit tests for Plaid Webhook API endpoint
 *
 * Tests cover:
 * 1. Webhook verification (with and without secret)
 * 2. Transaction webhook handling (all codes)
 * 3. Item webhook handling (ERROR, PENDING_EXPIRATION, LOGIN_REPAIRED)
 * 4. Error handling and edge cases
 * 5. Cache invalidation
 */

import { NextRequest } from "next/server"
import { POST } from "../route"
import * as plaidModule from "@/lib/api/plaid"
import * as prismaModule from "@/lib/db/prisma"
import * as syncServiceModule from "@/lib/sync/sync-service"
import * as nextCache from "next/cache"

// Mock modules
jest.mock("@/lib/api/plaid")
jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    item: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock("@/lib/sync/sync-service")
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}))

describe("Plaid Webhook API", () => {
  const mockPlaidClient = {
    webhookVerificationKeyGet: jest.fn(),
  }

  const mockItem = {
    id: "test-item-id",
    plaidItemId: "test-plaid-item-id",
    accessToken: "test-access-token",
    lastTransactionsCursor: "test-cursor",
    status: "ACTIVE",
  }

  const mockSyncStats = {
    transactionsAdded: 5,
    transactionsModified: 2,
    transactionsRemoved: 1,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock getPlaidClient
    ;(plaidModule.getPlaidClient as jest.Mock) = jest.fn(() => mockPlaidClient)

    // Mock default database responses
    ;(prismaModule.prisma.item.findFirst as jest.Mock).mockResolvedValue(mockItem)
    ;(prismaModule.prisma.item.update as jest.Mock).mockResolvedValue(mockItem)

    // Mock sync service
    ;(syncServiceModule.syncItemTransactions as jest.Mock).mockResolvedValue({
      stats: mockSyncStats,
      newCursor: "new-cursor",
    })

    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation()
    jest.spyOn(console, "warn").mockImplementation()
    jest.spyOn(console, "error").mockImplementation()

    // Clear environment variables
    delete process.env.PLAID_WEBHOOK_SECRET
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
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {})

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(console.error).toHaveBeenCalledWith("❌ Missing Plaid-Verification header")
    })

    it("should accept webhook with verification header when no secret is set", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-verification-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(console.warn).toHaveBeenCalledWith(
        "⚠️  Webhook verification disabled (set PLAID_WEBHOOK_SECRET for production)",
      )
    })

    it("should verify webhook with secret when PLAID_WEBHOOK_SECRET is set", async () => {
      // Arrange
      process.env.PLAID_WEBHOOK_SECRET = "test-secret"
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-verification-key",
      })

      mockPlaidClient.webhookVerificationKeyGet.mockResolvedValue({
        data: { key: "valid-key" },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(mockPlaidClient.webhookVerificationKeyGet).toHaveBeenCalledWith({
        key_id: "test-verification-key",
      })
    })

    it("should reject webhook with invalid verification when secret is set", async () => {
      // Arrange
      process.env.PLAID_WEBHOOK_SECRET = "test-secret"
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "invalid-key",
      })

      mockPlaidClient.webhookVerificationKeyGet.mockResolvedValue({
        data: null,
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(console.error).toHaveBeenCalledWith("❌ Webhook verification failed")
    })

    it("should reject webhook when verification throws error", async () => {
      // Arrange
      process.env.PLAID_WEBHOOK_SECRET = "test-secret"
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      mockPlaidClient.webhookVerificationKeyGet.mockRejectedValue(new Error("Verification service unavailable"))

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(console.error).toHaveBeenCalledWith("❌ Error verifying webhook:", expect.any(Error))
    })
  })

  describe("Transaction Webhooks", () => {
    it("should handle SYNC_UPDATES_AVAILABLE webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(prismaModule.prisma.item.findFirst).toHaveBeenCalledWith({
        where: { plaidItemId: "test-plaid-item-id" },
      })
      expect(syncServiceModule.syncItemTransactions).toHaveBeenCalledWith(
        mockItem.id,
        mockItem.accessToken,
        mockItem.lastTransactionsCursor,
      )
      expect(prismaModule.prisma.item.update).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        data: { lastTransactionsCursor: "new-cursor" },
      })
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("transactions", "max")
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("accounts", "max")
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("dashboard", "max")
    })

    it("should handle DEFAULT_UPDATE webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(syncServiceModule.syncItemTransactions).toHaveBeenCalled()
    })

    it("should handle INITIAL_UPDATE webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "INITIAL_UPDATE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(syncServiceModule.syncItemTransactions).toHaveBeenCalled()
    })

    it("should handle HISTORICAL_UPDATE webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "HISTORICAL_UPDATE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(syncServiceModule.syncItemTransactions).toHaveBeenCalled()
    })

    it("should handle TRANSACTIONS_REMOVED webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "TRANSACTIONS_REMOVED",
        item_id: "test-plaid-item-id",
        removed_transactions: ["txn-1", "txn-2"],
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(syncServiceModule.syncItemTransactions).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith("🗑️  Transactions removed:", ["txn-1", "txn-2"])
    })

    it("should skip transaction webhook if item_id is missing", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        // No item_id
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(syncServiceModule.syncItemTransactions).not.toHaveBeenCalled()
    })

    it("should log unhandled transaction webhook codes", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "UNKNOWN_CODE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(console.log).toHaveBeenCalledWith("ℹ️  Unhandled transaction webhook code: UNKNOWN_CODE")
      expect(syncServiceModule.syncItemTransactions).not.toHaveBeenCalled()
    })
  })

  describe("Item Webhooks", () => {
    it("should handle ERROR item webhook", async () => {
      // Arrange
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

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(prismaModule.prisma.item.update).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        data: { status: "ERROR" },
      })
      expect(console.error).toHaveBeenCalledWith("❌ Item error:", webhookBody.error)
    })

    it("should handle PENDING_EXPIRATION item webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "PENDING_EXPIRATION",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(prismaModule.prisma.item.update).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        data: { status: "PENDING_EXPIRATION" },
      })
      expect(console.warn).toHaveBeenCalledWith("⚠️  Item credentials expiring soon")
    })

    it("should handle LOGIN_REPAIRED item webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "LOGIN_REPAIRED",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(prismaModule.prisma.item.update).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        data: { status: "ACTIVE" },
      })
      expect(console.log).toHaveBeenCalledWith("✅ Item login repaired")
    })

    it("should handle unhandled item webhook codes", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "UNKNOWN_CODE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(console.log).toHaveBeenCalledWith("ℹ️  Unhandled item webhook code: UNKNOWN_CODE")
    })

    it("should skip item webhook if item_id is missing", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "ERROR",
        // No item_id
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(prismaModule.prisma.item.update).not.toHaveBeenCalled()
    })

    it("should gracefully handle item not found for item webhooks", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "ITEM",
        webhook_code: "ERROR",
        item_id: "non-existent-item-id",
        error: {
          error_code: "ITEM_LOGIN_REQUIRED",
          error_message: "User needs to re-authenticate",
        },
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      ;(prismaModule.prisma.item.findFirst as jest.Mock).mockResolvedValue(null)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(console.error).toHaveBeenCalledWith("❌ Item not found: non-existent-item-id")
      expect(prismaModule.prisma.item.update).not.toHaveBeenCalled()
    })
  })

  describe("Error Handling", () => {
    it("should return 200 with error when item not found for transaction webhook", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "non-existent-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      ;(prismaModule.prisma.item.findFirst as jest.Mock).mockResolvedValue(null)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.error).toBe("Item not found: non-existent-item-id")
      expect(console.error).toHaveBeenCalledWith("❌ Error processing webhook:", expect.any(Error))
    })

    it("should return 200 with error when sync fails", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      ;(syncServiceModule.syncItemTransactions as jest.Mock).mockRejectedValue(new Error("Sync service error"))

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.error).toBe("Sync service error")
      expect(console.error).toHaveBeenCalledWith("❌ Error processing webhook:", expect.any(Error))
    })

    it("should return 200 with error when database update fails", async () => {
      // Arrange
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

      ;(prismaModule.prisma.item.update as jest.Mock).mockRejectedValue(new Error("Database error"))

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.error).toBe("Database error")
      expect(console.error).toHaveBeenCalledWith("❌ Error processing webhook:", expect.any(Error))
    })

    it("should handle malformed JSON gracefully", async () => {
      // Arrange
      const request = {
        text: jest.fn().mockResolvedValue("invalid json"),
        headers: {
          get: jest.fn().mockReturnValue("test-key"),
        },
      } as unknown as NextRequest

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.error).toBeDefined()
      expect(console.error).toHaveBeenCalledWith("❌ Error processing webhook:", expect.any(Error))
    })
  })

  describe("Unhandled Webhook Types", () => {
    it("should log unhandled webhook types", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "UNKNOWN_TYPE",
        webhook_code: "SOME_CODE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(console.log).toHaveBeenCalledWith("ℹ️  Unhandled webhook type: UNKNOWN_TYPE")
    })
  })

  describe("Logging", () => {
    it("should log webhook receipt with correct information", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      await POST(request)

      // Assert
      expect(console.log).toHaveBeenCalledWith("\n🔔 Received Plaid webhook:", {
        type: "TRANSACTIONS",
        code: "SYNC_UPDATES_AVAILABLE",
        itemId: "test-plaid-item-id",
      })
    })

    it("should log transaction sync completion with stats", async () => {
      // Arrange
      const webhookBody = {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "test-plaid-item-id",
      }
      const request = createMockRequest(webhookBody, {
        "plaid-verification": "test-key",
      })

      // Act
      await POST(request)

      // Assert
      expect(console.log).toHaveBeenCalledWith("✅ Transaction sync complete:", {
        added: 5,
        modified: 2,
        removed: 1,
      })
    })
  })
})
