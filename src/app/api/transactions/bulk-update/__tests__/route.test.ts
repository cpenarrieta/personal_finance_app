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

import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import * as prismaModule from '@/lib/db/prisma'
import * as nextCache from 'next/cache'

// Mock modules
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    transaction: {
      updateMany: jest.fn(),
    },
    transactionTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}))

describe('Transactions Bulk Update API - PATCH', () => {
  const createMockRequest = (body: object) => {
    const bodyText = JSON.stringify(body)
    return {
      text: jest.fn().mockResolvedValue(bodyText),
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Successful Bulk Updates', () => {
    it('should update category for multiple transactions', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1', 'tx-2', 'tx-3'],
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 3 }
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, updatedCount: 3 })
      expect(prismaModule.prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['tx-1', 'tx-2', 'tx-3'] } },
        data: {
          categoryId: 'cat-1',
          subcategoryId: 'subcat-1',
        },
      })
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('transactions', 'max')
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('dashboard', 'max')
    })

    it('should update only category without subcategory', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1', 'tx-2'],
        categoryId: 'cat-1',
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 2 }
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, updatedCount: 2 })
      expect(prismaModule.prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['tx-1', 'tx-2'] } },
        data: { categoryId: 'cat-1' },
      })
    })

    it('should update tags for multiple transactions', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1', 'tx-2'],
        tagIds: ['tag-1', 'tag-2'],
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 2 }
      )
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue(
        { count: 3 }
      )
      ;(prismaModule.prisma.transactionTag.createMany as jest.Mock).mockResolvedValue(
        { count: 4 }
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, updatedCount: 2 })
      expect(prismaModule.prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId: { in: ['tx-1', 'tx-2'] } },
      })
      expect(prismaModule.prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: 'tx-1', tagId: 'tag-1' },
          { transactionId: 'tx-1', tagId: 'tag-2' },
          { transactionId: 'tx-2', tagId: 'tag-1' },
          { transactionId: 'tx-2', tagId: 'tag-2' },
        ],
      })
    })

    it('should remove all tags when tagIds is empty array', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1', 'tx-2'],
        tagIds: [],
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 2 }
      )
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue(
        { count: 3 }
      )

      // Act
      const response = await PATCH(request)

      // Assert
      expect(response.status).toBe(200)
      expect(prismaModule.prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId: { in: ['tx-1', 'tx-2'] } },
      })
      expect(prismaModule.prisma.transactionTag.createMany).not.toHaveBeenCalled()
    })

    it('should handle single transaction update', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1'],
        categoryId: 'cat-1',
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 1 }
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, updatedCount: 1 })
    })

    it('should update both category and tags together', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1', 'tx-2'],
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        tagIds: ['tag-1'],
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 2 }
      )
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue(
        { count: 1 }
      )
      ;(prismaModule.prisma.transactionTag.createMany as jest.Mock).mockResolvedValue(
        { count: 2 }
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, updatedCount: 2 })
    })

    it('should handle large batch of transactions', async () => {
      // Arrange
      const transactionIds = Array.from({ length: 100 }, (_, i) => `tx-${i}`)
      const updateData = {
        transactionIds,
        categoryId: 'cat-1',
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 100 }
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, updatedCount: 100 })
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 when transactionIds is missing', async () => {
      // Arrange
      const updateData = {
        categoryId: 'cat-1',
      }
      const request = createMockRequest(updateData)

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(prismaModule.prisma.transaction.updateMany).not.toHaveBeenCalled()
    })

    it('should return 400 when transactionIds is empty array', async () => {
      // Arrange
      const updateData = {
        transactionIds: [],
        categoryId: 'cat-1',
      }
      const request = createMockRequest(updateData)

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 400 when transactionIds is not an array', async () => {
      // Arrange
      const updateData = {
        transactionIds: 'not-an-array',
        categoryId: 'cat-1',
      }
      const request = createMockRequest(updateData)

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    // Note: The schema allows all update fields to be optional, so having
    // just transactionIds is valid. The API will execute an updateMany with no changes,
    // which is semantically valid (no-op operation).
  })

  describe('Error Handling', () => {
    it('should return 500 when database update fails', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1', 'tx-2'],
        categoryId: 'cat-1',
      }
      const request = createMockRequest(updateData)

      const dbError = new Error('Database error')
      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockRejectedValue(
        dbError
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to bulk update transactions' })
      expect(console.error).toHaveBeenCalledWith(
        'Error bulk updating transactions:',
        dbError
      )
    })

    it('should return 500 when tag deletion fails', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1'],
        tagIds: ['tag-1'],
      }
      const request = createMockRequest(updateData)

      const dbError = new Error('Tag deletion failed')
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockRejectedValue(
        dbError
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to bulk update transactions' })
    })

    it('should return 500 when tag creation fails', async () => {
      // Arrange
      const updateData = {
        transactionIds: ['tx-1'],
        tagIds: ['tag-1'],
      }
      const request = createMockRequest(updateData)

      ;(prismaModule.prisma.transaction.updateMany as jest.Mock).mockResolvedValue(
        { count: 1 }
      )
      ;(prismaModule.prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue(
        { count: 0 }
      )

      const dbError = new Error('Tag creation failed')
      ;(prismaModule.prisma.transactionTag.createMany as jest.Mock).mockRejectedValue(
        dbError
      )

      // Act
      const response = await PATCH(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to bulk update transactions' })
    })
  })
})
