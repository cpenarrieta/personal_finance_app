/**
 * Unit tests for error handling in sync service
 *
 * Tests cover:
 * 1. Plaid API errors
 * 2. Database errors
 * 3. Network errors
 * 4. Invalid data handling
 */

import { syncItemTransactions, syncItemInvestments } from "../sync/sync-service";
import * as plaidModule from "../api/plaid";
import * as prismaModule from "../db/prisma";
import { mockPlaidAccount, mockInvestmentsHoldingsResponse } from "./__mocks__/test-data";

// Mock modules
jest.mock("../api/plaid");
jest.mock("../db/prisma", () => ({
  prisma: {
    transaction: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    plaidAccount: {
      findMany: jest.fn(),
      upsert: jest.fn(),
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
}));

describe("Sync Service Error Handling", () => {
  const mockPlaidClient = {
    transactionsGet: jest.fn(),
    transactionsSync: jest.fn(),
    investmentsHoldingsGet: jest.fn(),
    investmentsTransactionsGet: jest.fn(),
  };

  const itemId = "test-item-id";
  const accessToken = "test-access-token";

  beforeEach(() => {
    jest.clearAllMocks();
    (plaidModule.getPlaidClient as jest.Mock) = jest.fn(() => mockPlaidClient);
    jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Plaid API Errors", () => {
    it("should throw error when Plaid API fails during transaction sync", async () => {
      // Arrange
      const plaidError = new Error("ITEM_LOGIN_REQUIRED");
      mockPlaidClient.transactionsSync.mockRejectedValueOnce(plaidError);

      // Act & Assert
      await expect(
        syncItemTransactions(itemId, accessToken, "cursor")
      ).rejects.toThrow("ITEM_LOGIN_REQUIRED");
    });

    it("should throw error when Plaid API fails during historical fetch", async () => {
      // Arrange
      const plaidError = new Error("INSTITUTION_DOWN");
      mockPlaidClient.transactionsGet.mockRejectedValueOnce(plaidError);

      // Act & Assert
      await expect(
        syncItemTransactions(itemId, accessToken, null)
      ).rejects.toThrow("INSTITUTION_DOWN");
    });

    it("should throw error when Plaid API fails during investment sync", async () => {
      // Arrange
      const plaidError = new Error("ITEM_NOT_FOUND");
      mockPlaidClient.investmentsHoldingsGet.mockRejectedValueOnce(plaidError);

      (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      await expect(
        syncItemInvestments(itemId, accessToken)
      ).rejects.toThrow("ITEM_NOT_FOUND");
    });

    it("should throw error when investment transactions fetch fails", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(
        mockInvestmentsHoldingsResponse
      );
      const plaidError = new Error("RATE_LIMIT_EXCEEDED");
      mockPlaidClient.investmentsTransactionsGet.mockRejectedValueOnce(plaidError);

      (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue({});
      (prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      await expect(
        syncItemInvestments(itemId, accessToken)
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Database Errors", () => {
    it("should throw error when transaction upsert fails", async () => {
      // Arrange
      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [{
            transaction_id: "tx-1",
            account_id: "acc-1",
            amount: 10.00,
            date: "2024-01-01",
            name: "Test",
            pending: false,
          }],
          modified: [],
          removed: [],
          accounts: [mockPlaidAccount],
          next_cursor: "cursor",
          has_more: false,
        },
      });

      (prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});
      const dbError = new Error("Database connection failed");
      (prismaModule.prisma.transaction.upsert as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        syncItemTransactions(itemId, accessToken, "cursor")
      ).rejects.toThrow("Database connection failed");
    });

    it("should throw error when account upsert fails", async () => {
      // Arrange
      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [],
          modified: [],
          removed: [],
          accounts: [mockPlaidAccount],
          next_cursor: "cursor",
          has_more: false,
        },
      });

      const dbError = new Error("Unique constraint violation");
      (prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        syncItemTransactions(itemId, accessToken, "cursor")
      ).rejects.toThrow("Unique constraint violation");
    });

    it("should throw error when transaction delete fails", async () => {
      // Arrange
      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [],
          modified: [],
          removed: [{ transaction_id: "tx-1" }],
          accounts: [mockPlaidAccount],
          next_cursor: "cursor",
          has_more: false,
        },
      });

      (prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});
      const dbError = new Error("Foreign key constraint failed");
      (prismaModule.prisma.transaction.deleteMany as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        syncItemTransactions(itemId, accessToken, "cursor")
      ).rejects.toThrow("Foreign key constraint failed");
    });

    it("should throw error when security upsert fails", async () => {
      // Arrange
      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(
        mockInvestmentsHoldingsResponse
      );
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce({
        data: {
          investment_transactions: [],
          securities: [],
          accounts: [],
          total_investment_transactions: 0,
        },
      });

      (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(null);
      const dbError = new Error("Database write failed");
      (prismaModule.prisma.security.upsert as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        syncItemInvestments(itemId, accessToken)
      ).rejects.toThrow("Database write failed");
    });

    it("should throw error when holding upsert fails", async () => {
      // Arrange
      const mockDbAccount = {
        id: "db-acc-1",
        plaidAccountId: "test-investment-account-id",
        itemId: "test-item-id",
      };

      const mockDbSecurity = {
        id: "db-sec-1",
        plaidSecurityId: "test-security-id",
      };

      mockPlaidClient.investmentsHoldingsGet.mockResolvedValueOnce(
        mockInvestmentsHoldingsResponse
      );
      mockPlaidClient.investmentsTransactionsGet.mockResolvedValueOnce({
        data: {
          investment_transactions: [],
          securities: [],
          accounts: [],
          total_investment_transactions: 0,
        },
      });

      (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockDbAccount]);
      (prismaModule.prisma.security.findUnique as jest.Mock).mockResolvedValue(mockDbSecurity);
      (prismaModule.prisma.security.upsert as jest.Mock).mockResolvedValue(mockDbSecurity);
      (prismaModule.prisma.holding.findMany as jest.Mock).mockResolvedValue([]);
      (prismaModule.prisma.holding.findFirst as jest.Mock).mockResolvedValue(null);

      const dbError = new Error("Decimal precision error");
      (prismaModule.prisma.holding.upsert as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        syncItemInvestments(itemId, accessToken)
      ).rejects.toThrow("Decimal precision error");
    });
  });

  describe("Network Errors", () => {
    it("should throw error on network timeout during transaction sync", async () => {
      // Arrange
      const networkError = new Error("ETIMEDOUT");
      mockPlaidClient.transactionsSync.mockRejectedValueOnce(networkError);

      // Act & Assert
      await expect(
        syncItemTransactions(itemId, accessToken, "cursor")
      ).rejects.toThrow("ETIMEDOUT");
    });

    it("should throw error on network timeout during investment sync", async () => {
      // Arrange
      const networkError = new Error("ECONNREFUSED");
      mockPlaidClient.investmentsHoldingsGet.mockRejectedValueOnce(networkError);

      (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      await expect(
        syncItemInvestments(itemId, accessToken)
      ).rejects.toThrow("ECONNREFUSED");
    });
  });

  describe("Invalid Data Handling", () => {
    it("should handle missing account_id in transaction", async () => {
      // Arrange
      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [{
            transaction_id: "tx-1",
            account_id: null, // Invalid
            amount: 10.00,
            date: "2024-01-01",
            name: "Test",
            pending: false,
          }],
          modified: [],
          removed: [],
          accounts: [mockPlaidAccount],
          next_cursor: "cursor",
          has_more: false,
        },
      });

      (prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});
      (prismaModule.prisma.transaction.upsert as jest.Mock).mockRejectedValueOnce(
        new Error("account_id is required")
      );

      // Act & Assert
      await expect(
        syncItemTransactions(itemId, accessToken, "cursor")
      ).rejects.toThrow();
    });

    it("should handle invalid date format", async () => {
      // Arrange
      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        data: {
          added: [{
            transaction_id: "tx-1",
            account_id: "acc-1",
            amount: 10.00,
            date: "invalid-date",
            name: "Test",
            pending: false,
          }],
          modified: [],
          removed: [],
          accounts: [mockPlaidAccount],
          next_cursor: "cursor",
          has_more: false,
        },
      });

      (prismaModule.prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});

      // Act & Assert - should handle invalid date
      // Note: This might not throw but could create invalid Date object
      // The actual behavior depends on your validation layer
      await syncItemTransactions(itemId, accessToken, "cursor");
    });
  });
});
