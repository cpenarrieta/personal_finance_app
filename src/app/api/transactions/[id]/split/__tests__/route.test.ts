/**
 * @jest-environment node
 *
 * Unit tests for POST /api/transactions/[id]/split
 *
 * Tests cover:
 * 1. Successful split with valid amounts
 * 2. Split with custom descriptions
 * 3. Split with categories and subcategories
 * 4. Validation: minimum 2 splits required
 * 5. Validation: split amounts must sum to original amount
 * 6. Transaction not found (404)
 * 7. Transaction already split (400)
 * 8. Decimal precision handling
 * 9. Database transaction errors
 */

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("POST /api/transactions/[id]/split", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any): NextRequest => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  const createMockParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  const mockOriginalTransaction = {
    id: "transaction-123",
    plaidTransactionId: "plaid-txn-123",
    accountId: "account-123",
    name: "Original Transaction",
    amount: new Decimal(100.00),
    date: new Date("2024-01-15"),
    authorizedDate: new Date("2024-01-14"),
    pending: false,
    merchantName: "Test Merchant",
    isoCurrencyCode: "USD",
    plaidCategory: "Shopping",
    plaidSubcategory: "General",
    paymentChannel: "online",
    logoUrl: "https://example.com/logo.png",
    categoryIconUrl: "https://example.com/icon.png",
    isSplit: false,
    categoryId: null,
    subcategoryId: null,
    notes: null,
  };

  describe("Successful Split", () => {
    it("should split transaction into 2 parts with valid amounts", async () => {
      const mockUpdatedOriginal = {
        ...mockOriginalTransaction,
        isSplit: true,
      };

      const mockChildTransactions = [
        {
          id: "child-1",
          plaidTransactionId: "plaid-txn-123_split_1_1234567890",
          amount: new Decimal(60.00),
          name: "Original Transaction (Split 1/2)",
          parentTransactionId: "transaction-123",
        },
        {
          id: "child-2",
          plaidTransactionId: "plaid-txn-123_split_2_1234567890",
          amount: new Decimal(40.00),
          name: "Original Transaction (Split 2/2)",
          parentTransactionId: "transaction-123",
        },
      ];

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest
              .fn()
              .mockResolvedValueOnce(mockChildTransactions[0])
              .mockResolvedValueOnce(mockChildTransactions[1]),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 40.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message", "Transaction split successfully");
      expect(data.data).toHaveProperty("original");
      expect(data.data).toHaveProperty("children");
      expect(data.data.children).toHaveLength(2);
    });

    it("should split transaction with custom descriptions", async () => {
      const mockUpdatedOriginal = {
        ...mockOriginalTransaction,
        isSplit: true,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest
              .fn()
              .mockImplementation((data) =>
                Promise.resolve({ id: "child", ...data.data })
              ),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: 60.00, description: "Groceries" },
          { amount: 40.00, description: "Household Items" },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);

      expect(response.status).toBe(200);
    });

    it("should split transaction with categories and subcategories", async () => {
      const mockUpdatedOriginal = {
        ...mockOriginalTransaction,
        isSplit: true,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      let capturedCreateCalls: any[] = [];

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest.fn().mockImplementation((args) => {
              capturedCreateCalls.push(args.data);
              return Promise.resolve({ id: "child", ...args.data });
            }),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          {
            amount: 60.00,
            categoryId: "category-1",
            subcategoryId: "subcategory-1",
            notes: "Food items",
          },
          {
            amount: 40.00,
            categoryId: "category-2",
            subcategoryId: "subcategory-2",
            notes: "Cleaning supplies",
          },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);

      expect(response.status).toBe(200);
      expect(capturedCreateCalls[0]).toMatchObject({
        categoryId: "category-1",
        subcategoryId: "subcategory-1",
        notes: "Food items",
      });
      expect(capturedCreateCalls[1]).toMatchObject({
        categoryId: "category-2",
        subcategoryId: "subcategory-2",
        notes: "Cleaning supplies",
      });
    });

    it("should handle decimal amounts with precision", async () => {
      const mockTransaction = {
        ...mockOriginalTransaction,
        amount: new Decimal(99.99),
      };

      const mockUpdatedOriginal = {
        ...mockTransaction,
        isSplit: true,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest
              .fn()
              .mockImplementation((args) =>
                Promise.resolve({ id: "child", ...args.data })
              ),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: 33.33 },
          { amount: 33.33 },
          { amount: 33.33 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);

      expect(response.status).toBe(200);
    });

    it("should handle string amounts by converting to Decimal", async () => {
      const mockUpdatedOriginal = {
        ...mockOriginalTransaction,
        isSplit: true,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest
              .fn()
              .mockImplementation((args) =>
                Promise.resolve({ id: "child", ...args.data })
              ),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: "60.00" },
          { amount: "40.00" },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);

      expect(response.status).toBe(200);
    });

    it("should create split with 3 or more parts", async () => {
      const mockUpdatedOriginal = {
        ...mockOriginalTransaction,
        isSplit: true,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest
              .fn()
              .mockImplementation((args) =>
                Promise.resolve({ id: "child", ...args.data })
              ),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: 25.00 },
          { amount: 25.00 },
          { amount: 25.00 },
          { amount: 25.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.children).toHaveLength(4);
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 if fewer than 2 splits provided", async () => {
      const requestBody = {
        splits: [{ amount: 100.00 }],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
      expect(data.details).toContain("At least 2 splits are required");
    });

    it("should return 400 if splits array is empty", async () => {
      const requestBody = {
        splits: [],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 if split amounts do not sum to original amount", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 50.00 }, // Sum is 110, but original is 100
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty(
        "error",
        "Split amounts must sum to original transaction amount"
      );
      expect(data.details).toHaveProperty("original", "100");
      expect(data.details).toHaveProperty("total", "110");
    });

    it("should return 400 if split amounts are less than original", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      const requestBody = {
        splits: [
          { amount: 40.00 },
          { amount: 40.00 }, // Sum is 80, but original is 100
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty(
        "error",
        "Split amounts must sum to original transaction amount"
      );
      expect(data.details).toHaveProperty("original", "100");
      expect(data.details).toHaveProperty("total", "80");
    });

    it("should return 400 for invalid JSON body", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest;
      const params = createMockParams("transaction-123");

      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid amount type", async () => {
      const requestBody = {
        splits: [
          { amount: "invalid" },
          { amount: 50.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });
  });

  describe("Transaction Not Found", () => {
    it("should return 404 when transaction does not exist", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 40.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("nonexistent-id");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Transaction not found" });
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: "nonexistent-id" },
      });
    });
  });

  describe("Already Split Transaction", () => {
    it("should return 400 when transaction is already split", async () => {
      const alreadySplitTransaction = {
        ...mockOriginalTransaction,
        isSplit: true,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        alreadySplitTransaction
      );

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 40.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Transaction has already been split" });
    });
  });

  describe("Database Transaction Errors", () => {
    it("should return 500 when database transaction fails", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error("Database transaction error")
      );

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 40.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to split transaction" });
    });

    it("should return 500 when child transaction creation fails", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest
              .fn()
              .mockResolvedValue({ ...mockOriginalTransaction, isSplit: true }),
            create: jest
              .fn()
              .mockRejectedValue(new Error("Child creation error")),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 40.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to split transaction" });
    });

    it("should return 500 when findUnique fails", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 40.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to split transaction" });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small decimal amounts", async () => {
      const mockTransaction = {
        ...mockOriginalTransaction,
        amount: new Decimal(0.03),
      };

      const mockUpdatedOriginal = {
        ...mockTransaction,
        isSplit: true,
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest
              .fn()
              .mockImplementation((args) =>
                Promise.resolve({ id: "child", ...args.data })
              ),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: 0.01 },
          { amount: 0.02 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await POST(req, params);

      expect(response.status).toBe(200);
    });

    it("should preserve all original transaction fields in child transactions", async () => {
      const mockUpdatedOriginal = {
        ...mockOriginalTransaction,
        isSplit: true,
      };

      let capturedChildData: any = null;

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockOriginalTransaction
      );

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          transaction: {
            update: jest.fn().mockResolvedValue(mockUpdatedOriginal),
            create: jest.fn().mockImplementation((args) => {
              capturedChildData = args.data;
              return Promise.resolve({ id: "child", ...args.data });
            }),
          },
        };
        return callback(mockTx);
      });

      const requestBody = {
        splits: [
          { amount: 60.00 },
          { amount: 40.00 },
        ],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      await POST(req, params);

      expect(capturedChildData).toMatchObject({
        accountId: mockOriginalTransaction.accountId,
        isoCurrencyCode: mockOriginalTransaction.isoCurrencyCode,
        date: mockOriginalTransaction.date,
        authorizedDate: mockOriginalTransaction.authorizedDate,
        pending: mockOriginalTransaction.pending,
        merchantName: mockOriginalTransaction.merchantName,
        plaidCategory: mockOriginalTransaction.plaidCategory,
        plaidSubcategory: mockOriginalTransaction.plaidSubcategory,
        paymentChannel: mockOriginalTransaction.paymentChannel,
        logoUrl: mockOriginalTransaction.logoUrl,
        categoryIconUrl: mockOriginalTransaction.categoryIconUrl,
        parentTransactionId: mockOriginalTransaction.id,
        originalTransactionId: mockOriginalTransaction.id,
      });
    });
  });
});
