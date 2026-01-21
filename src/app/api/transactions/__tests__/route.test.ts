/**
 * Unit tests for Transactions API endpoint
 *
 * Tests cover:
 * 1. Transaction creation with valid data
 * 2. Validation errors
 * 3. Account existence verification
 * 4. Cache invalidation
 * 5. Error handling
 */

import { NextRequest } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import * as nextCache from "next/cache"
import { GET, POST } from "../route"

const mockFetchQuery = fetchQuery as jest.MockedFunction<typeof fetchQuery>
const mockFetchMutation = fetchMutation as jest.MockedFunction<typeof fetchMutation>

describe("Transactions API", () => {
  const mockAccount = {
    _id: "account-1",
    name: "Checking Account",
  }

  const createMockRequest = (body: object, url = "http://localhost/api/transactions") => {
    const bodyText = JSON.stringify(body)
    return {
      url,
      text: jest.fn().mockResolvedValue(bodyText),
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("GET /api/transactions", () => {
    it("should return recent transactions", async () => {
      const mockTransactions = [
        { _id: "tx-1", name: "Transaction 1", amount: 50 },
        { _id: "tx-2", name: "Transaction 2", amount: 100 },
      ]
      mockFetchQuery.mockResolvedValue(mockTransactions)

      const request = { url: "http://localhost/api/transactions" } as NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.transactions).toHaveLength(2)
      expect(data.data.count).toBe(2)
    })

    it("should respect limit parameter", async () => {
      const mockTransactions = [{ _id: "tx-1", name: "Transaction 1", amount: 50 }]
      mockFetchQuery.mockResolvedValue(mockTransactions)

      const request = { url: "http://localhost/api/transactions?limit=10" } as NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 500 on error", async () => {
      mockFetchQuery.mockRejectedValue(new Error("Database error"))

      const request = { url: "http://localhost/api/transactions" } as NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to fetch transactions")
    })
  })

  describe("POST /api/transactions", () => {
    describe("Successful Transaction Creation", () => {
      it("should create a transaction with minimal required fields", async () => {
        const transactionData = {
          accountId: "account-1",
          name: "Test Transaction",
          amount: 50.0,
          date: "2024-01-15",
          pending: false,
        }
        const request = createMockRequest(transactionData)

        mockFetchQuery.mockResolvedValue(mockAccount) // account exists
        mockFetchMutation.mockResolvedValue("tx-1") // created transaction id

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data.id).toBe("tx-1")
        expect(mockFetchMutation).toHaveBeenCalled()
        expect(nextCache.revalidateTag).toHaveBeenCalledWith("transactions", "max")
        expect(nextCache.revalidateTag).toHaveBeenCalledWith("dashboard", "max")
      })

      it("should create a transaction with all optional fields", async () => {
        const transactionData = {
          accountId: "account-1",
          name: "Restaurant Purchase",
          amount: 75.5,
          date: "2024-01-15",
          pending: false,
          merchantName: "Tasty Restaurant",
          isoCurrencyCode: "USD",
          authorizedDate: "2024-01-14",
          plaidCategory: "Food and Drink",
          plaidSubcategory: "Restaurants",
          paymentChannel: "in store",
          categoryId: "cat-1",
          subcategoryId: "subcat-1",
          notes: "Business lunch with client",
          tagIds: ["tag-1", "tag-2"],
        }
        const request = createMockRequest(transactionData)

        mockFetchQuery.mockResolvedValue(mockAccount)
        mockFetchMutation.mockResolvedValue("tx-1")

        const response = await POST(request)

        expect(response.status).toBe(201)
        expect(mockFetchMutation).toHaveBeenCalled()
      })
    })

    describe("Validation Errors", () => {
      it("should return 400 when accountId is missing", async () => {
        const transactionData = {
          name: "Test Transaction",
          amount: 50.0,
          date: "2024-01-15",
          pending: false,
        }
        const request = createMockRequest(transactionData)

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe("Invalid request data")
        expect(mockFetchMutation).not.toHaveBeenCalled()
      })

      it("should return 400 when amount is missing", async () => {
        const transactionData = {
          accountId: "account-1",
          name: "Test Transaction",
          date: "2024-01-15",
          pending: false,
        }
        const request = createMockRequest(transactionData)

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe("Invalid request data")
      })

      it("should return 400 when date is null", async () => {
        const transactionData = {
          accountId: "account-1",
          name: "Test Transaction",
          amount: 50.0,
          date: null,
          pending: false,
        }
        const request = createMockRequest(transactionData)

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe("Invalid request data")
      })

      it("should return 400 when name is missing", async () => {
        const transactionData = {
          accountId: "account-1",
          amount: 50.0,
          date: "2024-01-15",
          pending: false,
        }
        const request = createMockRequest(transactionData)

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe("Invalid request data")
      })
    })

    describe("Account Verification", () => {
      it("should return 404 when account does not exist", async () => {
        const transactionData = {
          accountId: "non-existent-account",
          name: "Test Transaction",
          amount: 50.0,
          date: "2024-01-15",
          pending: false,
        }
        const request = createMockRequest(transactionData)

        mockFetchQuery.mockResolvedValue(null) // account not found

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
        expect(data.error).toBe("Account not found")
        expect(mockFetchMutation).not.toHaveBeenCalled()
      })
    })

    describe("Error Handling", () => {
      it("should return 500 when database create fails", async () => {
        const transactionData = {
          accountId: "account-1",
          name: "Test Transaction",
          amount: 50.0,
          date: "2024-01-15",
          pending: false,
        }
        const request = createMockRequest(transactionData)

        mockFetchQuery.mockResolvedValue(mockAccount)
        mockFetchMutation.mockRejectedValue(new Error("Database error"))

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe("Failed to create transaction")
      })

      it("should return 409 when transaction already exists", async () => {
        const transactionData = {
          accountId: "account-1",
          name: "Test Transaction",
          amount: 50.0,
          date: "2024-01-15",
          pending: false,
        }
        const request = createMockRequest(transactionData)

        mockFetchQuery.mockResolvedValue(mockAccount)
        mockFetchMutation.mockRejectedValue(new Error("Transaction already exists"))

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.success).toBe(false)
        expect(data.error).toBe("A transaction with this ID already exists")
      })
    })
  })
})
