/**
 * Unit tests for syncItemInvestments
 *
 * Tests cover:
 * 1. Securities sync (new + existing)
 * 2. Holdings sync (add, update, remove)
 * 3. Custom price preservation
 * 4. Investment transactions sync
 */

import { Prisma } from "@prisma/client"
import { syncItemInvestments } from "../sync/sync-service"
import * as plaidModule from "../api/plaid"
import * as prismaModule from "../db/prisma"
import {
  mockPlaidSecurity,
  mockPlaidHolding,
  mockPlaidInvestmentTransaction,
  mockInvestmentsHoldingsResponse,
  mockInvestmentsTransactionsResponse,
  mockDbAccount,
  mockDbSecurity,
  mockDbHolding,
} from "./__mocks__/test-data"

// Mock modules
jest.mock("../api/plaid")
jest.mock("../db/prisma", () => ({
  prisma: {
    plaidAccount: {
      findMany: jest.fn(),
    },
    security: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    holding: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    investmentTransaction: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

describe("syncItemInvestments", () => {
  const mockPlaidClient = {
    investmentsHoldingsGet: jest.fn(),
    investmentsTransactionsGet: jest.fn(),
  }

  const itemId = "test-item-id"
  const accessToken = "test-access-token"

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock getPlaidClient
    ;(plaidModule.getPlaidClient as jest.Mock) = jest.fn(() => mockPlaidClient)

    // Suppress console logs
    jest.spyOn(console, "log").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("Securities Sync", () => {
    it("should add new securities", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(null) // New security
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.securitiesAdded).toBe(1)
      expect(prismaModule.prisma.security.upsert).toHaveBeenCalledWith({
        where: { plaidSecurityId: mockPlaidSecurity.security_id },
        update: expect.objectContaining({
          name: mockPlaidSecurity.name,
          tickerSymbol: mockPlaidSecurity.ticker_symbol,
          type: mockPlaidSecurity.type,
        }),
        create: expect.objectContaining({
          plaidSecurityId: mockPlaidSecurity.security_id,
          name: mockPlaidSecurity.name,
          tickerSymbol: mockPlaidSecurity.ticker_symbol,
        }),
      })
    })

    it("should update existing securities without counting as new", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity) // Existing
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.securitiesAdded).toBe(0)
      expect(prismaModule.prisma.security.upsert).toHaveBeenCalled()
    })
  })

  describe("Holdings Sync", () => {
    it("should add new holdings", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // For securities upsert
        .mockResolvedValueOnce(mockDbSecurity) // For holdings lookup
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null) // New holding
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.holdingsAdded).toBe(1)
      expect(result.holdingsUpdated).toBe(0)
      expect(prismaModule.prisma.holding.upsert).toHaveBeenCalledWith({
        where: { id: "new-holding" },
        update: expect.objectContaining({
          quantity: expect.any(Prisma.Decimal),
          costBasis: expect.any(Prisma.Decimal),
          institutionPrice: expect.any(Prisma.Decimal),
        }),
        create: expect.objectContaining({
          accountId: mockDbAccount.id,
          securityId: mockDbSecurity.id,
          quantity: expect.any(Prisma.Decimal),
        }),
      })
    })

    it("should update existing holdings", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([mockDbHolding])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(mockDbHolding) // Existing
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.holdingsAdded).toBe(0)
      expect(result.holdingsUpdated).toBe(1)
    })

    it("should remove holdings no longer in Plaid response", async () => {
      // Arrange
      const holdingToRemove = {
        ...mockDbHolding,
        id: "holding-to-remove",
        account: {
          ...mockDbAccount,
          plaidAccountId: "different-account",
        },
        security: {
          ...mockDbSecurity,
          plaidSecurityId: "different-security",
        },
      }

      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([mockDbHolding, holdingToRemove])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(mockDbHolding)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.holding.delete as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.holdingsRemoved).toBe(1)
      expect(prismaModule.prisma.holding.delete).toHaveBeenCalledWith({
        where: { id: holdingToRemove.id },
      })
    })
  })

  describe("Custom Price Preservation", () => {
    it("should preserve existing price when Plaid price is zero", async () => {
      // Arrange
      const holdingWithZeroPrice = {
        ...mockPlaidHolding,
        institution_price: 0,
        institution_price_as_of: null,
      }

      const existingHoldingWithPrice = {
        ...mockDbHolding,
        institutionPrice: new Prisma.Decimal(175.5),
        institutionPriceAsOf: new Date("2024-01-10"),
      }

      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce({
        data: {
          securities: [mockPlaidSecurity],
          holdings: [holdingWithZeroPrice],
          accounts: mockInvestmentsHoldingsResponse.data.accounts,
        },
      })
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(existingHoldingWithPrice)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      await syncItemInvestments(itemId, accessToken)

      // Assert
      const upsertCall = (prismaModule.prisma.holding.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.update.institutionPrice).toEqual(existingHoldingWithPrice.institutionPrice)
      expect(upsertCall.update.institutionPriceAsOf).toEqual(existingHoldingWithPrice.institutionPriceAsOf)
    })

    it("should use Plaid price when it's non-zero", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      await syncItemInvestments(itemId, accessToken)

      // Assert
      const upsertCall = (prismaModule.prisma.holding.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.update.institutionPrice.toNumber()).toBe(175.5)
    })

    it("should use Plaid price when existing price is zero", async () => {
      // Arrange
      const existingHoldingWithZeroPrice = {
        ...mockDbHolding,
        institutionPrice: new Prisma.Decimal(0),
      }

      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(existingHoldingWithZeroPrice)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      await syncItemInvestments(itemId, accessToken)

      // Assert
      const upsertCall = (prismaModule.prisma.holding.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.update.institutionPrice.toNumber()).toBe(175.5)
    })
  })

  describe("Investment Transactions Sync", () => {
    it("should add new investment transactions", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null) // New
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.investmentTransactionsAdded).toBe(1)
      expect(prismaModule.prisma.investmentTransaction.upsert).toHaveBeenCalledWith({
        where: { plaidInvestmentTransactionId: mockPlaidInvestmentTransaction.investment_transaction_id },
        update: expect.objectContaining({
          accountId: mockDbAccount.id,
          securityId: mockDbSecurity.id,
          type: mockPlaidInvestmentTransaction.type,
          amount: expect.any(Prisma.Decimal),
          price: expect.any(Prisma.Decimal),
          quantity: expect.any(Prisma.Decimal),
        }),
        create: expect.objectContaining({
          plaidInvestmentTransactionId: mockPlaidInvestmentTransaction.investment_transaction_id,
          accountId: mockDbAccount.id,
          type: mockPlaidInvestmentTransaction.type,
        }),
      })
    })

    it("should update existing investment transactions", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce(mockInvestmentsTransactionsResponse)

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-inv-tx",
        plaidInvestmentTransactionId: mockPlaidInvestmentTransaction.investment_transaction_id,
      }) // Existing
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.investmentTransactionsAdded).toBe(0)
      expect(prismaModule.prisma.investmentTransaction.upsert).toHaveBeenCalled()
    })

    it("should handle investment transactions without securities", async () => {
      // Arrange
      const txWithoutSecurity = {
        ...mockPlaidInvestmentTransaction,
        security_id: null,
      }

      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce({
        data: {
          ...mockInvestmentsTransactionsResponse.data,
          investment_transactions: [txWithoutSecurity],
        },
      })

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount])
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.holding.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.investmentTransaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.investmentTransactionsAdded).toBe(1)
      const upsertCall = (prismaModule.prisma.investmentTransaction.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.create.securityId).toBeNull()
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty investment data", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce({
        data: {
          securities: [],
          holdings: [],
          accounts: [],
        },
      })
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce({
        data: {
          investment_transactions: [],
          securities: [],
          accounts: [],
          total_investment_transactions: 0,
        },
      })

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.securitiesAdded).toBe(0)
      expect(result.holdingsAdded).toBe(0)
      expect(result.holdingsUpdated).toBe(0)
      expect(result.investmentTransactionsAdded).toBe(0)
    })

    it("should skip holdings without matching account", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(mockInvestmentsHoldingsResponse)
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce({
        data: {
          investment_transactions: [],
          securities: [],
          accounts: [],
          total_investment_transactions: 0,
        },
      })

      ;(prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]) // No accounts
      ;(prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity)
      ;(prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([])

      // Act
      const result = await syncItemInvestments(itemId, accessToken)

      // Assert
      expect(result.securitiesAdded).toBe(1) // Security still added
      expect(result.holdingsAdded).toBe(0) // But holding skipped
      expect(prismaModule.prisma.holding.upsert).not.toHaveBeenCalled()
    })
  })
})
