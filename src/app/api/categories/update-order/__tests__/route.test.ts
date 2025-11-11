/**
 * Unit tests for Categories Update Order API endpoint
 *
 * Tests cover:
 * 1. Successful batch update of category order
 * 2. Invalid request format handling
 * 3. Database transaction failures
 * 4. Empty updates array
 */

import { PUT } from "../route"
import * as prismaModule from "@/lib/db/prisma"
import { CategoryGroupType } from "@prisma/client"

// Mock modules
jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    category: {
      update: jest.fn(),
    },
  },
}))

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
      // Arrange
      const updates = [
        { id: "cat-1", groupType: "EXPENSE" as CategoryGroupType, displayOrder: 1 },
        { id: "cat-2", groupType: "EXPENSE" as CategoryGroupType, displayOrder: 2 },
        { id: "cat-3", groupType: "INCOME" as CategoryGroupType, displayOrder: 1 },
      ]
      const request = createMockRequest({ updates })

      ;(prismaModule.prisma.$transaction as jest.Mock).mockResolvedValue([])

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prismaModule.prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it("should handle updates with null groupType", async () => {
      // Arrange
      const updates = [{ id: "cat-1", groupType: null, displayOrder: 1 }]
      const request = createMockRequest({ updates })

      ;(prismaModule.prisma.$transaction as jest.Mock).mockResolvedValue([])

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })

    it("should handle updates with null displayOrder", async () => {
      // Arrange
      const updates = [{ id: "cat-1", groupType: "EXPENSE" as CategoryGroupType, displayOrder: null }]
      const request = createMockRequest({ updates })

      ;(prismaModule.prisma.$transaction as jest.Mock).mockResolvedValue([])

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })

    it("should handle large batch updates", async () => {
      // Arrange
      const updates = Array.from({ length: 50 }, (_, i) => ({
        id: `cat-${i}`,
        groupType: i % 2 === 0 ? ("EXPENSE" as CategoryGroupType) : ("INCOME" as CategoryGroupType),
        displayOrder: i,
      }))
      const request = createMockRequest({ updates })

      ;(prismaModule.prisma.$transaction as jest.Mock).mockResolvedValue([])

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prismaModule.prisma.$transaction).toHaveBeenCalledTimes(1)
    })
  })

  describe("Invalid Request Handling", () => {
    it("should return 400 when updates is missing", async () => {
      // Arrange
      const request = createMockRequest({})

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Invalid updates format" })
      expect(prismaModule.prisma.$transaction).not.toHaveBeenCalled()
    })

    it("should return 400 when updates is not an array", async () => {
      // Arrange
      const request = createMockRequest({ updates: "not-an-array" })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Invalid updates format" })
      expect(prismaModule.prisma.$transaction).not.toHaveBeenCalled()
    })

    it("should return 400 when updates is null", async () => {
      // Arrange
      const request = createMockRequest({ updates: null })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Invalid updates format" })
    })

    it("should handle empty updates array", async () => {
      // Arrange
      const request = createMockRequest({ updates: [] })

      ;(prismaModule.prisma.$transaction as jest.Mock).mockResolvedValue([])

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prismaModule.prisma.$transaction).toHaveBeenCalledWith([])
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when transaction fails", async () => {
      // Arrange
      const updates = [{ id: "cat-1", groupType: "EXPENSE" as CategoryGroupType, displayOrder: 1 }]
      const request = createMockRequest({ updates })

      const dbError = new Error("Transaction failed")
      ;(prismaModule.prisma.$transaction as jest.Mock).mockRejectedValue(dbError)

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to update" })
      expect(console.error).toHaveBeenCalledWith("Error updating category order:", dbError)
    })

    it("should handle category not found errors", async () => {
      // Arrange
      const updates = [{ id: "non-existent-id", groupType: "EXPENSE" as CategoryGroupType, displayOrder: 1 }]
      const request = createMockRequest({ updates })

      const notFoundError = new Error("Record not found")
      ;(prismaModule.prisma.$transaction as jest.Mock).mockRejectedValue(notFoundError)

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to update" })
    })

    it("should handle malformed JSON in request body", async () => {
      // Arrange
      const request = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as Request

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to update" })
    })
  })
})
