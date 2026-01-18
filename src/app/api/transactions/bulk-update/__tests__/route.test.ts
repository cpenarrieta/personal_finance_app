/**
 * Unit tests for Transactions Bulk Update API endpoint
 *
 * Tests cover:
 * 1. Bulk updating categories and subcategories
 * 2. Bulk updating tags
 * 3. Validation errors
 * 4. Cache invalidation
 * 5. Error handling
 */

import { NextRequest } from "next/server"
import { PATCH } from "../route"
import { fetchMutation } from "convex/nextjs"
import * as nextCache from "next/cache"

const mockFetchMutation = fetchMutation as jest.MockedFunction<typeof fetchMutation>

describe("Transactions Bulk Update API - PATCH", () => {
  const createMockRequest = (body: object) => {
    const bodyText = JSON.stringify(body)
    return {
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

  describe("Successful Bulk Updates", () => {
    it("should update category for multiple transactions", async () => {
      const updateData = {
        transactionIds: ["tx-1", "tx-2", "tx-3"],
        categoryId: "cat-1",
        subcategoryId: "subcat-1",
      }
      const request = createMockRequest(updateData)

      mockFetchMutation.mockResolvedValue({ updatedCount: 3 })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ updatedCount: 3 })
      expect(mockFetchMutation).toHaveBeenCalled()
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("transactions", "max")
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("dashboard", "max")
    })

    it("should update only category without subcategory", async () => {
      const updateData = {
        transactionIds: ["tx-1", "tx-2"],
        categoryId: "cat-1",
      }
      const request = createMockRequest(updateData)

      mockFetchMutation.mockResolvedValue({ updatedCount: 2 })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ updatedCount: 2 })
    })

    it("should update tags for multiple transactions", async () => {
      const updateData = {
        transactionIds: ["tx-1", "tx-2"],
        tagIds: ["tag-1", "tag-2"],
      }
      const request = createMockRequest(updateData)

      mockFetchMutation.mockResolvedValue({ updatedCount: 2 })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ updatedCount: 2 })
    })

    it("should remove all tags when tagIds is empty array", async () => {
      const updateData = {
        transactionIds: ["tx-1", "tx-2"],
        tagIds: [],
      }
      const request = createMockRequest(updateData)

      mockFetchMutation.mockResolvedValue({ updatedCount: 2 })

      const response = await PATCH(request)

      expect(response.status).toBe(200)
      expect(mockFetchMutation).toHaveBeenCalled()
    })

    it("should handle single transaction update", async () => {
      const updateData = {
        transactionIds: ["tx-1"],
        categoryId: "cat-1",
      }
      const request = createMockRequest(updateData)

      mockFetchMutation.mockResolvedValue({ updatedCount: 1 })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ updatedCount: 1 })
    })

    it("should update both category and tags together", async () => {
      const updateData = {
        transactionIds: ["tx-1", "tx-2"],
        categoryId: "cat-1",
        subcategoryId: "subcat-1",
        tagIds: ["tag-1"],
      }
      const request = createMockRequest(updateData)

      mockFetchMutation.mockResolvedValue({ updatedCount: 2 })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ updatedCount: 2 })
    })

    it("should handle large batch of transactions", async () => {
      const transactionIds = Array.from({ length: 100 }, (_, i) => `tx-${i}`)
      const updateData = {
        transactionIds,
        categoryId: "cat-1",
      }
      const request = createMockRequest(updateData)

      mockFetchMutation.mockResolvedValue({ updatedCount: 100 })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ updatedCount: 100 })
    })
  })

  describe("Validation Errors", () => {
    it("should return 400 when transactionIds is missing", async () => {
      const updateData = {
        categoryId: "cat-1",
      }
      const request = createMockRequest(updateData)

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid request data")
      expect(mockFetchMutation).not.toHaveBeenCalled()
    })

    it("should return 400 when transactionIds is empty array", async () => {
      const updateData = {
        transactionIds: [],
        categoryId: "cat-1",
      }
      const request = createMockRequest(updateData)

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid request data")
    })

    it("should return 400 when transactionIds is not an array", async () => {
      const updateData = {
        transactionIds: "not-an-array",
        categoryId: "cat-1",
      }
      const request = createMockRequest(updateData)

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid request data")
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when database update fails", async () => {
      const updateData = {
        transactionIds: ["tx-1", "tx-2"],
        categoryId: "cat-1",
      }
      const request = createMockRequest(updateData)

      const dbError = new Error("Database error")
      mockFetchMutation.mockRejectedValue(dbError)

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to bulk update transactions")
    })
  })
})
