/**
 * Unit tests for syncItemTransactions
 *
 * Tests cover:
 * 1. Initial sync with no cursor (historical fetch)
 * 2. Incremental sync with existing cursor
 * 3. Account updates during sync
 * 4. Transaction additions
 * 5. Transaction modifications
 * 6. Transaction removals
 */

import { Prisma } from "@prisma/generated"
import { syncItemTransactions } from "../sync/sync-service"
import * as plaidModule from "../api/plaid"
import * as prismaModule from "../db/prisma"
import {
  mockPlaidAccount,
  mockPlaidTransaction,
  mockHistoricalTransactionsResponse,
  mockTransactionsSyncResponse,
  mockTransactionsSyncResponseWithAdded,
  mockTransactionsSyncResponseWithModified,
  mockTransactionsSyncResponseWithRemoved,
} from "./__mocks__/test-data"

// Mock modules
jest.mock("../api/plaid")
jest.mock("../db/prisma", () => ({
  prisma: {
    transaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    plaidAccount: {
      upsert: jest.fn(),
    },
  },
}))

describe("syncItemTransactions - Basic Path", () => {
  const mockPlaidClient = {
    transactionsGet: jest.fn(),
    transactionsSync: jest.fn(),
  }

  const itemId = "test-item-id"
  const accessToken = "test-access-token"

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock getPlaidClient to return our mock client
    ;(plaidModule.getPlaidClient as jest.Mock) = jest.fn(() => mockPlaidClient)

    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("Initial Sync (No Cursor)", () => {
    it("should fetch historical transactions and set up initial cursor", async () => {
      // Arrange
      const lastCursor = null

      // Mock historical fetch
      mockPlaidClient.transactionsGet.mockResolvedValueOnce(mockHistoricalTransactionsResponse)

      // Mock incremental sync (no new data)
      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponse)

      // Mock Prisma responses
      ;(prismaModule.prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.transaction.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(mockPlaidClient.transactionsGet).toHaveBeenCalledTimes(1)
      expect(mockPlaidClient.transactionsGet).toHaveBeenCalledWith({
        access_token: accessToken,
        start_date: "2024-01-01",
        end_date: expect.any(String),
        options: {
          count: 500,
          offset: 0,
        },
      })

      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledTimes(1)
      expect(result.stats.transactionsAdded).toBe(1)
      expect(result.newCursor).toBe("new-cursor-value")
    })

    it("should handle paginated historical transactions", async () => {
      // Arrange
      const lastCursor = null

      // Create an array of 500 transactions for first page
      const firstPageTransactions = Array.from({ length: 500 }, (_, i) => ({
        ...mockPlaidTransaction,
        transaction_id: `tx-${i}`,
      }))

      // Create 1 transaction for second page to reach total of 501
      const secondPageTransactions = [
        {
          ...mockPlaidTransaction,
          transaction_id: "tx-500",
        },
      ]

      // Mock paginated historical fetch
      mockPlaidClient.transactionsGet
        .mockResolvedValueOnce({
          data: {
            transactions: firstPageTransactions,
            total_transactions: 501,
            accounts: [mockPlaidAccount],
          },
        })
        .mockResolvedValueOnce({
          data: {
            transactions: secondPageTransactions,
            total_transactions: 501,
            accounts: [mockPlaidAccount],
          },
        })

      // Mock incremental sync (called after historical)
      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponse)

      // Mock Prisma responses
      ;(prismaModule.prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.transaction.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(mockPlaidClient.transactionsGet).toHaveBeenCalledTimes(2)
      expect(mockPlaidClient.transactionsGet).toHaveBeenNthCalledWith(1, {
        access_token: accessToken,
        start_date: "2024-01-01",
        end_date: expect.any(String),
        options: {
          count: 500,
          offset: 0,
        },
      })
      expect(mockPlaidClient.transactionsGet).toHaveBeenNthCalledWith(2, {
        access_token: accessToken,
        start_date: "2024-01-01",
        end_date: expect.any(String),
        options: {
          count: 500,
          offset: 500,
        },
      })
      expect(result.stats.transactionsAdded).toBe(501)
    })

    it("should not add duplicate transactions during historical fetch", async () => {
      // Arrange
      const lastCursor = null

      mockPlaidClient.transactionsGet.mockResolvedValueOnce(mockHistoricalTransactionsResponse)

      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponse)

      // Mock transaction already exists in DB
      ;(prismaModule.prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-id",
        plaidTransactionId: "test-transaction-id",
        isSplit: false,
        amount: new Prisma.Decimal(25),
      })
      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-id",
        plaidTransactionId: "test-transaction-id",
        amount: new Prisma.Decimal(25),
      })
      ;(prismaModule.prisma.transaction.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.transactionsAdded).toBe(0) // Not counted as added since it exists
      expect(prismaModule.prisma.transaction.upsert).toHaveBeenCalled()
    })
  })

  describe("Incremental Sync (With Cursor)", () => {
    it("should skip historical fetch when cursor exists", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      // Mock incremental sync
      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponse)
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(mockPlaidClient.transactionsGet).not.toHaveBeenCalled()
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: accessToken,
        cursor: lastCursor,
        count: 500,
      })
      expect(result.newCursor).toBe("new-cursor-value")
    })

    it("should handle multiple pages in incremental sync", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      // Mock paginated sync responses
      mockPlaidClient.transactionsSync
        .mockResolvedValueOnce({
          data: {
            ...mockTransactionsSyncResponse.data,
            has_more: true,
            next_cursor: "cursor-page-1",
          },
        })
        .mockResolvedValueOnce({
          data: {
            ...mockTransactionsSyncResponse.data,
            has_more: false,
            next_cursor: "cursor-page-2",
          },
        })
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledTimes(2)
      expect(result.newCursor).toBe("cursor-page-2")
    })
  })

  describe("Account Updates", () => {
    it("should update account balances during sync", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponse)
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.accountsUpdated).toBe(1)
      expect(prismaModule.prisma.plaidAccount.upsert).toHaveBeenCalledWith({
        where: { plaidAccountId: mockPlaidAccount.account_id },
        update: expect.objectContaining({
          itemId,
          currentBalance: expect.any(Prisma.Decimal),
          availableBalance: expect.any(Prisma.Decimal),
          balanceUpdatedAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          plaidAccountId: mockPlaidAccount.account_id,
          itemId,
          currentBalance: expect.any(Prisma.Decimal),
        }),
      })
    })

    it("should preserve custom account names during update", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponse)
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})

      // Act
      await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      const upsertCall = (prismaModule.prisma.plaidAccount.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.update).not.toHaveProperty("name") // Name should NOT be in update
      expect(upsertCall.create).toHaveProperty("name") // But should be in create
    })
  })

  describe("Transaction Additions", () => {
    it("should add new transactions from sync", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponseWithAdded)
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.transaction.upsert as jest.Mock).mockResolvedValue({ id: "test-transaction-id" })

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.transactionsAdded).toBe(1)
      expect(result.stats.newTransactionIds).toEqual(["test-transaction-id"])
      expect(prismaModule.prisma.transaction.upsert).toHaveBeenCalledWith({
        where: { plaidTransactionId: "new-transaction-id" },
        update: expect.objectContaining({
          name: "New Transaction",
          amount: expect.any(Prisma.Decimal),
        }),
        create: expect.objectContaining({
          plaidTransactionId: "new-transaction-id",
          name: "New Transaction",
          amount: expect.any(Prisma.Decimal),
        }),
        select: { id: true },
      })
    })
  })

  describe("Transaction Modifications", () => {
    it("should update modified transactions", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponseWithModified)
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})
      // Mock findFirst for isSplitTransaction check
      ;(prismaModule.prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)
      // Mock findUnique for sign change check
      ;(prismaModule.prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-id",
        amount: new Prisma.Decimal(25),
      })
      ;(prismaModule.prisma.transaction.update as jest.Mock).mockResolvedValue({ id: "updated-id" })

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.transactionsModified).toBe(1)
      expect(prismaModule.prisma.transaction.update).toHaveBeenCalledWith({
        where: { plaidTransactionId: mockPlaidTransaction.transaction_id },
        data: expect.objectContaining({
          pending: false,
          amount: expect.any(Prisma.Decimal),
        }),
        select: { id: true },
      })
    })
  })

  describe("Transaction Removals", () => {
    it("should delete removed transactions", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      mockPlaidClient.transactionsSync.mockResolvedValueOnce(mockTransactionsSyncResponseWithRemoved)
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.transaction.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.transactionsRemoved).toBe(1)
      expect(prismaModule.prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: {
          plaidTransactionId: { in: ["removed-transaction-id"] },
          isSplit: false,
          parentTransactionId: null,
        },
      })
    })

    it("should handle multiple removed transactions", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [],
          modified: [],
          removed: [{ transaction_id: "removed-1" }, { transaction_id: "removed-2" }, { transaction_id: "removed-3" }],
          accounts: [mockPlaidAccount],
          next_cursor: "cursor-after-remove",
          has_more: false,
        },
      })
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.transaction.deleteMany as jest.Mock).mockResolvedValue({ count: 3 })

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.transactionsRemoved).toBe(3)
      expect(prismaModule.prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: {
          plaidTransactionId: { in: ["removed-1", "removed-2", "removed-3"] },
          isSplit: false,
          parentTransactionId: null,
        },
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty sync response", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [],
          modified: [],
          removed: [],
          accounts: [],
          next_cursor: "same-cursor",
          has_more: false,
        },
      })

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.accountsUpdated).toBe(0)
      expect(result.stats.transactionsAdded).toBe(0)
      expect(result.stats.transactionsModified).toBe(0)
      expect(result.stats.transactionsRemoved).toBe(0)
      expect(result.newCursor).toBe("same-cursor")
    })

    it("should handle null/undefined optional fields", async () => {
      // Arrange
      const lastCursor = "existing-cursor"

      const transactionWithNulls = {
        ...mockPlaidTransaction,
        iso_currency_code: null,
        authorized_date: null,
        merchant_name: null,
        pending_transaction_id: null,
        logo_url: null,
        personal_finance_category_icon_url: null,
        personal_finance_category: null,
      }

      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [transactionWithNulls],
          modified: [],
          removed: [],
          accounts: [mockPlaidAccount],
          next_cursor: "new-cursor",
          has_more: false,
        },
      })
      ;(prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({})
      ;(prismaModule.prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaModule.prisma.transaction.upsert as jest.Mock).mockResolvedValue({ id: "test-transaction-id" })

      // Act
      const result = await syncItemTransactions(itemId, accessToken, lastCursor)

      // Assert
      expect(result.stats.transactionsAdded).toBe(1)
      expect(result.stats.newTransactionIds).toEqual(["test-transaction-id"])
      expect(prismaModule.prisma.transaction.upsert).toHaveBeenCalledWith({
        where: { plaidTransactionId: transactionWithNulls.transaction_id },
        update: expect.objectContaining({
          isoCurrencyCode: null,
          authorizedDate: null,
          merchantName: null,
          plaidCategory: null,
          plaidSubcategory: null,
        }),
        create: expect.objectContaining({
          isoCurrencyCode: null,
          authorizedDate: null,
          merchantName: null,
          plaidCategory: null,
          plaidSubcategory: null,
        }),
        select: { id: true },
      })
    })
  })
})
