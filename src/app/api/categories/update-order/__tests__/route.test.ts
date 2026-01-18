/**
 * Unit tests for Categories Update Order API endpoint
 *
 * Tests cover:
 * 1. Successful batch update of category order
 * 2. Invalid request format handling
 * 3. Database failures
 */

import { PUT } from "../route"
import { fetchMutation } from "convex/nextjs"

const mockFetchMutation = fetchMutation as jest.MockedFunction<typeof fetchMutation>

describe("Categories Update Order API - PUT", () => {
  const createMockRequest = (body: object) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Request
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("Successful Updates", () => {
    it("should update category order successfully", async () => {
      const updates = [
        { id: "cat-1", groupType: "EXPENSES", displayOrder: 1 },
        { id: "cat-2", groupType: "EXPENSES", displayOrder: 2 },
        { id: "cat-3", groupType: "INCOME", displayOrder: 1 },
      ]
      const request = createMockRequest({ updates })
      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.updated).toBe(true)
      expect(mockFetchMutation).toHaveBeenCalledTimes(1)
    })

    it("should handle updates with null groupType", async () => {
      const updates = [{ id: "cat-1", groupType: null, displayOrder: 1 }]
      const request = createMockRequest({ updates })
      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.updated).toBe(true)
    })

    it("should handle updates with null displayOrder", async () => {
      const updates = [{ id: "cat-1", groupType: "EXPENSES", displayOrder: null }]
      const request = createMockRequest({ updates })
      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.updated).toBe(true)
    })

    it("should handle large batch updates", async () => {
      const updates = Array.from({ length: 50 }, (_, i) => ({
        id: `cat-${i}`,
        groupType: i % 2 === 0 ? "EXPENSES" : "INCOME",
        displayOrder: i,
      }))
      const request = createMockRequest({ updates })
      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.updated).toBe(true)
      expect(mockFetchMutation).toHaveBeenCalledTimes(1)
    })
  })

  describe("Invalid Request Handling", () => {
    it("should return 400 when updates is missing", async () => {
      const request = createMockRequest({})

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid updates format")
      expect(mockFetchMutation).not.toHaveBeenCalled()
    })

    it("should return 400 when updates is not an array", async () => {
      const request = createMockRequest({ updates: "not-an-array" })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid updates format")
      expect(mockFetchMutation).not.toHaveBeenCalled()
    })

    it("should return 400 when updates is null", async () => {
      const request = createMockRequest({ updates: null })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid updates format")
    })

    it("should handle empty updates array", async () => {
      const request = createMockRequest({ updates: [] })
      mockFetchMutation.mockResolvedValue(undefined)

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.updated).toBe(true)
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when mutation fails", async () => {
      const updates = [{ id: "cat-1", groupType: "EXPENSES", displayOrder: 1 }]
      const request = createMockRequest({ updates })

      const dbError = new Error("Mutation failed")
      mockFetchMutation.mockRejectedValue(dbError)

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to update")
    })

    it("should handle category not found errors", async () => {
      const updates = [{ id: "non-existent-id", groupType: "EXPENSES", displayOrder: 1 }]
      const request = createMockRequest({ updates })

      const notFoundError = new Error("Record not found")
      mockFetchMutation.mockRejectedValue(notFoundError)

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to update")
    })

    it("should handle malformed JSON in request body", async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as Request

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to update")
    })
  })
})
