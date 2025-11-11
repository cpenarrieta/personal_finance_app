/**
 * Unit tests for Transaction [id] API endpoint
 *
 * Tests cover:
 * 1. Transaction updates (PATCH)
 * 2. Transaction deletion (DELETE)
 * 3. Tag management during updates
 * 4. Split transaction handling during deletion
 * 5. Cache invalidation
 * 6. Error handling
 */

import { NextRequest } from "next/server"
import { PATCH, DELETE } from "../route"
import * as prismaModule from "@/lib/db/prisma"
import * as nextCache from "next/cache"

// Mock modules
jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    transaction: {
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    transactionTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}))

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}))

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
      // Arrange
      const transactionId = "tx-1"
      const updateData = { name: "Updated Transaction Name" }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const updatedTransaction = {
        id: transactionId,
        name: "Updated Transaction Name",
      }

      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      // Act
      const response = await PATCH(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(updatedTransaction)
      expect(prismaModule.prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { name: "Updated Transaction Name" },
      })
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("transactions", "max")
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("dashboard", "max")
    })

    it("should update transaction category and subcategory", async () => {
      // Arrange
      const transactionId = "tx-1"
      const updateData = {
        categoryId: "cat-1",
        subcategoryId: "subcat-1",
      }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const updatedTransaction = {
        id: transactionId,
        categoryId: "cat-1",
        subcategoryId: "subcat-1",
      }

      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      // Act
      const response = await PATCH(request, { params })

      // Assert
      expect(response.status).toBe(200)
      expect(prismaModule.prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          category: { connect: { id: "cat-1" } },
          subcategory: { connect: { id: "subcat-1" } },
        },
      })
    })

    it("should disconnect category when set to null", async () => {
      // Arrange
      const transactionId = "tx-1"
      const updateData = { categoryId: null }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const updatedTransaction = {
        id: transactionId,
        categoryId: null,
      }

      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      // Act
      const response = await PATCH(request, { params })

      // Assert
      expect(response.status).toBe(200)
      expect(prismaModule.prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          category: { disconnect: true },
        },
      })
    })

    it("should update transaction tags", async () => {
      // Arrange
      const transactionId = "tx-1"
      const updateData = { tagIds: ["tag-1", "tag-2"] }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const updatedTransaction = { id: transactionId }

      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prismaModule.prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({ count: 2 })
      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      // Act
      const response = await PATCH(request, { params })

      // Assert
      expect(response.status).toBe(200)
      expect(prismaModule.prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId },
      })
      expect(prismaModule.prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId, tagId: "tag-1" },
          { transactionId, tagId: "tag-2" },
        ],
      })
    })

    it("should remove all tags when tagIds is empty array", async () => {
      // Arrange
      const transactionId = "tx-1"
      const updateData = { tagIds: [] }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const updatedTransaction = { id: transactionId }

      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({ count: 2 })
      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      // Act
      const response = await PATCH(request, { params })

      // Assert
      expect(response.status).toBe(200)
      expect(prismaModule.prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId },
      })
      expect(prismaModule.prisma.transactionTag.createMany).not.toHaveBeenCalled()
    })

    it("should update notes", async () => {
      // Arrange
      const transactionId = "tx-1"
      const updateData = { notes: "Updated notes" }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const updatedTransaction = {
        id: transactionId,
        notes: "Updated notes",
      }

      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      // Act
      const response = await PATCH(request, { params })

      // Assert
      expect(response.status).toBe(200)
      expect(prismaModule.prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { notes: "Updated notes" },
      })
    })

    it("should handle unknown fields gracefully (Zod strips them)", async () => {
      // Arrange
      const transactionId = "tx-1"
      const updateData = { name: "Valid Name", invalidField: "invalid" }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const updatedTransaction = {
        id: transactionId,
        name: "Valid Name",
      }

      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      // Act
      const response = await PATCH(request, { params })

      // Assert
      // Zod strips unknown fields, so the update should succeed with valid fields
      expect(response.status).toBe(200)
    })

    it("should return 500 when update fails", async () => {
      // Arrange
      const transactionId = "tx-1"
      const updateData = { name: "Updated Name" }
      const request = createMockRequest(updateData)
      const params = createMockParams(transactionId)

      const dbError = new Error("Database error")
      ;(prismaModule.prisma.transaction.update as jest.Mock).mockRejectedValue(dbError)

      // Act
      const response = await PATCH(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to update transaction" })
      expect(console.error).toHaveBeenCalledWith("Error updating transaction:", dbError)
    })
  })

  describe("DELETE - Delete Transaction", () => {
    it("should delete a transaction without child transactions", async () => {
      // Arrange
      const transactionId = "tx-1"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      const mockTransaction = {
        id: transactionId,
        name: "Test Transaction",
        childTransactions: [],
      }

      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prismaModule.prisma.transaction.delete as jest.Mock).mockResolvedValue(mockTransaction)

      // Act
      const response = await DELETE(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prismaModule.prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId },
      })
      expect(prismaModule.prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      })
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("transactions", "max")
      expect(nextCache.revalidateTag).toHaveBeenCalledWith("dashboard", "max")
    })

    it("should delete child transactions for split transactions", async () => {
      // Arrange
      const transactionId = "tx-1"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      const mockTransaction = {
        id: transactionId,
        name: "Split Parent Transaction",
        childTransactions: [
          { id: "child-1", parentTransactionId: transactionId },
          { id: "child-2", parentTransactionId: transactionId },
        ],
      }

      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prismaModule.prisma.transaction.deleteMany as jest.Mock).mockResolvedValue({ count: 2 })
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prismaModule.prisma.transaction.delete as jest.Mock).mockResolvedValue(mockTransaction)

      // Act
      const response = await DELETE(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prismaModule.prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { parentTransactionId: transactionId },
      })
      expect(prismaModule.prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      })
    })

    it("should return 404 when transaction does not exist", async () => {
      // Arrange
      const transactionId = "non-existent-tx"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null)

      // Act
      const response = await DELETE(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: "Transaction not found" })
      expect(prismaModule.prisma.transaction.delete).not.toHaveBeenCalled()
    })

    it("should return 500 when delete fails", async () => {
      // Arrange
      const transactionId = "tx-1"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      const mockTransaction = {
        id: transactionId,
        name: "Test Transaction",
        childTransactions: [],
      }

      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })

      const dbError = new Error("Database error")
      ;(prismaModule.prisma.transaction.delete as jest.Mock).mockRejectedValue(dbError)

      // Act
      const response = await DELETE(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to delete transaction" })
      expect(console.error).toHaveBeenCalledWith("Error deleting transaction:", dbError)
    })

    it("should handle deletion when transaction has no tags", async () => {
      // Arrange
      const transactionId = "tx-1"
      const request = {} as NextRequest
      const params = createMockParams(transactionId)

      const mockTransaction = {
        id: transactionId,
        name: "Transaction Without Tags",
        childTransactions: [],
      }

      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prismaModule.prisma.transaction.delete as jest.Mock).mockResolvedValue(mockTransaction)

      // Act
      const response = await DELETE(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })
  })
})
