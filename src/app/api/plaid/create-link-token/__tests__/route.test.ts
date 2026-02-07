/**
 * Unit tests for Plaid Create Link Token API endpoint
 *
 * Tests cover:
 * 1. Creating link token for new item
 * 2. Creating link token for update/reauth mode
 * 3. Environment variable handling
 * 4. Error handling
 */

import { NextRequest } from "next/server"
import { POST } from "../route"
import * as plaidModule from "@/lib/api/plaid"

// Mock modules
jest.mock("@/lib/api/plaid")

// Mock convex/nextjs for server-side token lookup
const mockFetchQuery = jest.fn()
jest.mock("convex/nextjs", () => ({
  fetchQuery: (...args: any[]) => mockFetchQuery(...args),
}))

describe("Plaid Create Link Token API - POST", () => {
  const mockPlaidClient = {
    linkTokenCreate: jest.fn(),
  }

  const createMockRequest = (body: object = {}) => {
    const bodyText = JSON.stringify(body)
    return {
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(bodyText),
    } as unknown as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation()

    // Mock getPlaidClient
    ;(plaidModule.getPlaidClient as jest.Mock) = jest.fn(() => mockPlaidClient)

    // Default: mock fetchQuery to return access token for update mode tests
    mockFetchQuery.mockResolvedValue({ accessToken: "access-token-abc" })

    // Set up default environment variables
    process.env.PLAID_PRODUCTS = "transactions,investments"
    process.env.PLAID_COUNTRY_CODES = "US,CA"
    process.env.PLAID_REDIRECT_URI = "https://example.com/oauth-redirect"
    process.env.BETTER_AUTH_URL = "https://example.com"
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.PLAID_PRODUCTS
    delete process.env.PLAID_COUNTRY_CODES
    delete process.env.PLAID_REDIRECT_URI
    delete process.env.BETTER_AUTH_URL
  })

  describe("New Item Mode", () => {
    it("should create link token for new item", async () => {
      // Arrange
      const request = createMockRequest({})

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-12345" },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ link_token: "link-token-12345" })
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: "local-user" },
        client_name: "Personal Finance (Local)",
        language: "en",
        redirect_uri: "https://example.com/oauth-redirect",
        webhook: "https://example.com/api/plaid/webhook",
        products: ["transactions", "investments"],
        country_codes: ["US", "CA"],
      })
    })

    it("should handle missing redirect_uri", async () => {
      // Arrange
      delete process.env.PLAID_REDIRECT_URI
      const request = createMockRequest({})

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-12345" },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: "local-user" },
        client_name: "Personal Finance (Local)",
        language: "en",
        redirect_uri: undefined,
        webhook: "https://example.com/api/plaid/webhook",
        products: ["transactions", "investments"],
        country_codes: ["US", "CA"],
      })
    })

    it("should handle single product", async () => {
      // Arrange
      process.env.PLAID_PRODUCTS = "transactions"
      const request = createMockRequest({})

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-12345" },
      })

      // Act
      await POST(request)

      // Assert
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          products: ["transactions"],
        }),
      )
    })

    it("should handle single country code", async () => {
      // Arrange
      process.env.PLAID_COUNTRY_CODES = "US"
      const request = createMockRequest({})

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-12345" },
      })

      // Act
      await POST(request)

      // Assert
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          country_codes: ["US"],
        }),
      )
    })
  })

  describe("Update/Reauth Mode", () => {
    it("should create link token for update mode with item_id", async () => {
      // Arrange - client sends item_id, server looks up access token
      const request = createMockRequest({ item_id: "item-123" })

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-update-12345" },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ link_token: "link-token-update-12345" })
      expect(mockFetchQuery).toHaveBeenCalled()
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: "local-user" },
        client_name: "Personal Finance (Local)",
        language: "en",
        redirect_uri: "https://example.com/oauth-redirect",
        webhook: "https://example.com/api/plaid/webhook",
        access_token: "access-token-abc",
        country_codes: ["US", "CA"],
      })
    })

    it("should not include products in update mode", async () => {
      // Arrange
      const request = createMockRequest({ item_id: "item-123" })

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-update-12345" },
      })

      // Act
      await POST(request)

      // Assert
      const callArgs = mockPlaidClient.linkTokenCreate.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty("products")
      expect(callArgs).toHaveProperty("access_token", "access-token-abc")
    })

    it("should return 404 when item not found", async () => {
      // Arrange
      mockFetchQuery.mockResolvedValue(null)
      const request = createMockRequest({ item_id: "nonexistent-item" })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when Plaid API fails", async () => {
      // Arrange
      const request = createMockRequest({})

      const plaidError = {
        response: {
          data: {
            error_message: "Invalid client credentials",
            error_code: "INVALID_CREDENTIALS",
          },
        },
      }

      mockPlaidClient.linkTokenCreate.mockRejectedValue(plaidError)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid client credentials")
      expect(data.code).toBe("INVALID_CREDENTIALS")
      expect(console.error).toHaveBeenCalledWith("Error creating link token:", plaidError, {
        responseData: plaidError.response.data,
      })
    })

    it("should handle error without response data", async () => {
      // Arrange
      const request = createMockRequest({})

      const genericError = new Error("Network error")
      mockPlaidClient.linkTokenCreate.mockRejectedValue(genericError)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Network error")
      expect(data.code).toBe("LINK_TOKEN_ERROR")
      expect(console.error).toHaveBeenCalledWith("Error creating link token:", genericError, {
        responseData: undefined,
      })
    })

    it("should handle error without message", async () => {
      // Arrange
      const request = createMockRequest({})

      mockPlaidClient.linkTokenCreate.mockRejectedValue({})

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to create link token")
    })

    it("should handle malformed request body", async () => {
      // Arrange
      const request = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe("Environment Configuration", () => {
    it("should trim whitespace from product names", async () => {
      // Arrange
      process.env.PLAID_PRODUCTS = " transactions , investments "
      const request = createMockRequest({})

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-12345" },
      })

      // Act
      await POST(request)

      // Assert
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          products: ["transactions", "investments"],
        }),
      )
    })

    it("should trim whitespace from country codes", async () => {
      // Arrange
      process.env.PLAID_COUNTRY_CODES = " US , CA , GB "
      const request = createMockRequest({})

      mockPlaidClient.linkTokenCreate.mockResolvedValue({
        data: { link_token: "link-token-12345" },
      })

      // Act
      await POST(request)

      // Assert
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          country_codes: ["US", "CA", "GB"],
        }),
      )
    })
  })
})
