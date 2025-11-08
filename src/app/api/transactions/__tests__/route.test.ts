/**
 * Unit tests for Transactions API endpoint
 *
 * Tests cover:
 * 1. Transaction creation with valid data
 * 2. Validation errors
 * 3. Account existence verification
 * 4. Tag associations
 * 5. Cache invalidation
 * 6. Error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import * as prismaModule from '@/lib/db/prisma'
import * as nextCache from 'next/cache'
import { POST } from '../route'
import { Prisma } from '@prisma/client'

// Mock Prisma.Decimal - defined before jest.mock to avoid TDZ
class MockDecimal {
  value: number
  constructor(value: number) {
    this.value = value
  }
  toString() {
    return this.value.toString()
  }
}

// Mock Prisma.PrismaClientKnownRequestError - defined before jest.mock
class MockPrismaClientKnownRequestError extends Error {
  code: string
  clientVersion: string
  constructor(message: string, options: { code: string; clientVersion: string }) {
    super(message)
    this.code = options.code
    this.clientVersion = options.clientVersion
    this.name = 'PrismaClientKnownRequestError'
  }
}

// Mock the Prisma module - use factory function to avoid TDZ
jest.mock('@prisma/client', () => {
  // Re-declare classes inside factory to ensure they're in scope
  class Decimal {
    value: number
    constructor(value: number) {
      this.value = value
    }
    toString() {
      return this.value.toString()
    }
  }

  class PrismaClientKnownRequestError extends Error {
    code: string
    clientVersion: string
    constructor(message: string, options: { code: string; clientVersion: string }) {
      super(message)
      this.code = options.code
      this.clientVersion = options.clientVersion
      this.name = 'PrismaClientKnownRequestError'
    }
  }

  return {
    Prisma: {
      Decimal,
      PrismaClientKnownRequestError,
    },
  }
})

// Mock modules
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    plaidAccount: {
      findUnique: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    transactionTag: {
      createMany: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}))

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-nanoid-123'),
}))

describe('Transactions API - POST', () => {
  const mockAccount = {
    id: 'account-1',
    plaidAccountId: 'plaid-account-1',
    itemId: 'item-1',
    name: 'Checking Account',
  }

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

    // Default mock for account lookup
    ;(prismaModule.prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
      mockAccount
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Successful Transaction Creation', () => {
    it('should create a transaction with minimal required fields', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Test Transaction',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
      }
      const request = createMockRequest(transactionData)

      const createdTransaction = {
        id: 'tx-1',
        plaidTransactionId: 'manual_test-nanoid-123',
        accountId: 'account-1',
        name: 'Test Transaction',
        amount: new Prisma.Decimal(50.00),
        date: new Date('2024-01-15'),
        pending: false,
        isSplit: false,
      }

      ;(prismaModule.prisma.transaction.create as jest.Mock).mockResolvedValue(
        createdTransaction
      )

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.id).toBe(createdTransaction.id)
      expect(data.accountId).toBe(createdTransaction.accountId)
      expect(data.name).toBe(createdTransaction.name)
      expect(prismaModule.prisma.transaction.create).toHaveBeenCalled()
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('transactions', 'max')
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('dashboard', 'max')
    })

    it('should create a transaction with all optional fields', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Restaurant Purchase',
        amount: 75.50,
        date: '2024-01-15',
        pending: false,
        merchantName: 'Tasty Restaurant',
        isoCurrencyCode: 'USD',
        authorizedDate: '2024-01-14',
        plaidCategory: 'Food and Drink',
        plaidSubcategory: 'Restaurants',
        paymentChannel: 'in store',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        notes: 'Business lunch with client',
        tagIds: ['tag-1', 'tag-2'],
      }
      const request = createMockRequest(transactionData)

      const createdTransaction = {
        id: 'tx-1',
        plaidTransactionId: 'manual_test-nanoid-123',
        ...transactionData,
        amount: new Prisma.Decimal(75.50),
        date: new Date('2024-01-15'),
        authorizedDate: new Date('2024-01-14'),
        isSplit: false,
      }

      ;(prismaModule.prisma.transaction.create as jest.Mock).mockResolvedValue(
        createdTransaction
      )
      ;(prismaModule.prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 2,
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(prismaModule.prisma.transaction.create).toHaveBeenCalled()
      expect(prismaModule.prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: 'tx-1', tagId: 'tag-1' },
          { transactionId: 'tx-1', tagId: 'tag-2' },
        ],
      })
    })

    it('should create transaction with tags', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Tagged Transaction',
        amount: 100.00,
        date: '2024-01-15',
        pending: false,
        tagIds: ['tag-1'],
      }
      const request = createMockRequest(transactionData)

      const createdTransaction = {
        id: 'tx-1',
        plaidTransactionId: 'manual_test-nanoid-123',
        accountId: 'account-1',
        name: 'Tagged Transaction',
        amount: new Prisma.Decimal(100.00),
        date: new Date('2024-01-15'),
        pending: false,
        isSplit: false,
      }

      ;(prismaModule.prisma.transaction.create as jest.Mock).mockResolvedValue(
        createdTransaction
      )
      ;(prismaModule.prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(201)
      expect(prismaModule.prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: [{ transactionId: 'tx-1', tagId: 'tag-1' }],
      })
    })

    it('should not create tags when tagIds is empty', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'No Tags Transaction',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
        tagIds: [],
      }
      const request = createMockRequest(transactionData)

      const createdTransaction = {
        id: 'tx-1',
        plaidTransactionId: 'manual_test-nanoid-123',
        accountId: 'account-1',
        name: 'No Tags Transaction',
        amount: new Prisma.Decimal(50.00),
        date: new Date('2024-01-15'),
        pending: false,
        isSplit: false,
      }

      ;(prismaModule.prisma.transaction.create as jest.Mock).mockResolvedValue(
        createdTransaction
      )

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(201)
      expect(prismaModule.prisma.transactionTag.createMany).not.toHaveBeenCalled()
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 when accountId is missing', async () => {
      // Arrange
      const transactionData = {
        name: 'Test Transaction',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
      }
      const request = createMockRequest(transactionData)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(prismaModule.prisma.transaction.create).not.toHaveBeenCalled()
    })

    it('should return 400 when amount is missing', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Test Transaction',
        date: '2024-01-15',
        pending: false,
      }
      const request = createMockRequest(transactionData)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 400 when date format is completely wrong', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Test Transaction',
        amount: 50.00,
        date: null, // null is truly invalid for a required field
        pending: false,
      }
      const request = createMockRequest(transactionData)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 400 when name is missing', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
      }
      const request = createMockRequest(transactionData)

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })
  })

  describe('Account Verification', () => {
    it('should return 404 when account does not exist', async () => {
      // Arrange
      const transactionData = {
        accountId: 'non-existent-account',
        name: 'Test Transaction',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
      }
      const request = createMockRequest(transactionData)

      ;(prismaModule.prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        null
      )

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Account not found' })
      expect(prismaModule.prisma.transaction.create).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when database create fails', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Test Transaction',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
      }
      const request = createMockRequest(transactionData)

      const dbError = new Error('Database error')
      ;(prismaModule.prisma.transaction.create as jest.Mock).mockRejectedValue(
        dbError
      )

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to create transaction' })
      expect(console.error).toHaveBeenCalledWith(
        'Error creating transaction:',
        dbError
      )
    })

    it('should return 409 when plaidTransactionId already exists', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Test Transaction',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
      }
      const request = createMockRequest(transactionData)

      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      )

      ;(prismaModule.prisma.transaction.create as jest.Mock).mockRejectedValue(
        uniqueConstraintError
      )

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data).toEqual({ error: 'A transaction with this ID already exists' })
    })

    it('should handle tag creation failure gracefully', async () => {
      // Arrange
      const transactionData = {
        accountId: 'account-1',
        name: 'Test Transaction',
        amount: 50.00,
        date: '2024-01-15',
        pending: false,
        tagIds: ['tag-1'],
      }
      const request = createMockRequest(transactionData)

      const createdTransaction = {
        id: 'tx-1',
        plaidTransactionId: 'manual_test-nanoid-123',
        accountId: 'account-1',
        name: 'Test Transaction',
        amount: new Prisma.Decimal(50.00),
        date: new Date('2024-01-15'),
        pending: false,
        isSplit: false,
      }

      ;(prismaModule.prisma.transaction.create as jest.Mock).mockResolvedValue(
        createdTransaction
      )
      ;(prismaModule.prisma.transactionTag.createMany as jest.Mock).mockRejectedValue(
        new Error('Tag association failed')
      )

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to create transaction' })
    })
  })
})
