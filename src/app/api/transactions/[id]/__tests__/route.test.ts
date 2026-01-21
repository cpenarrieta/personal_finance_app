/**
 * Unit tests for Transaction [id] API endpoint
 *
 * Tests cover:
 * 1. Transaction updates (PATCH)
 * 2. Transaction deletion (DELETE)
 * 3. Cache invalidation
 * 4. Error handling
 */

import { NextRequest } from "next/server"
import { PATCH, DELETE } from "../route"
import { fetchMutation } from "convex/nextjs"
import * as nextCache from "next/cache"

const mockFetchMutation = fetchMutation as jest.MockedFunction<typeof fetchMutation>

describe("Transaction [id] API", () => {
  const createMockRequest = (body: object) => {
    const bodyText = JSON.stringify(body)
    return {
      text: jest.fn().mockResolvedValue(bodyText),
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  const createMockParams = (id: string) => {
    return Promise.resolve({ id })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("PATCH - Update Transaction", () => {
    it("should update transaction name", async () => {
      const transactionId = "tx-1"
      const updateData = { name: "Updated Transaction Name" }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(transactionId)
      expect(data.data.updated).toBe(true)
      expect(mockFetchMutation).toHaveBeenCalled()
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("transactions", "max")
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("dashboard", "max")
    })

    it("should update transaction category and subcategory", async () => {
      const transactionId = "tx-1"
      const updateData = {
        categoryId: "cat-1",
        subcategoryId: "subcat-1",
      }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PATCH(request, { params })

      expect(response.status).toBe(200)
      expect(mockFetchMutation).toHaveBeenCalled()
    })

    it("should clear category when set to null", async () => {
      const transactionId = "tx-1"
      const updateData = { categoryId: null }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PATCH(request, { params })

      expect(response.status).toBe(200)
      expect(mockFetchMutation).toHaveBeenCalled()
    })

    it("should update transaction tags", async () => {
      const transactionId = "tx-1"
      const updateData = { tagIds: ["tag-1", "tag-2"] }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PATCH(request, { params })

      expect(response.status).toBe(200)
      expect(mockFetchMutation).toHaveBeenCalled()
    })

    it("should update notes", async () => {
      const transactionId = "tx-1"
      const updateData = { notes: "Updated notes" }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PATCH(request, { params })

      expect(response.status).toBe(200)
      expect(mockFetchMutation).toHaveBeenCalled()
    })

    it("should return 500 when update fails", async () => {
      const transactionId = "tx-1"
      const updateData = { name: "Updated Name" }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const dbError = new Error("Database error")
      mockFetchMutation.mockRejectedValue(dbError)

      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to update transaction")
    })
  })

  describe("DELETE - Delete Transaction", () => {
    it("should delete a transaction", async () => {
      const transactionId = "tx-1"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      mockFetchMutation.mockResolvedValue(undefined)

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(true)
      expect(mockFetchMutation).toHaveBeenCalled()
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("transactions", "max")
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("dashboard", "max")
    })

    it("should return 404 when transaction does not exist", async () => {
      const transactionId = "non-existent-tx"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      mockFetchMutation.mockRejectedValue(new Error("Transaction not found"))

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Transaction not found")
    })

    it("should return 500 when delete fails", async () => {
      const transactionId = "tx-1"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      const dbError = new Error("Database error")
      mockFetchMutation.mockRejectedValue(dbError)

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to delete transaction")
    })
  })
})
