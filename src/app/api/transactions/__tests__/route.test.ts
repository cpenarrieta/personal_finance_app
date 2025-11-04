/**
 * @jest-environment node
 *
 * Unit tests for POST /api/transactions
 *
 * Tests cover:
 * 1. Successful transaction creation with all fields
 * 2. Successful transaction creation with minimal fields
 * 3. Transaction creation with tags
 * 4. Transaction creation with category and subcategory
 * 5. Validation errors (Zod schema)
 * 6. Account not found (404)
 * 7. Prisma unique constraint violation (409)
 * 8. General server errors (500)
 * 9. Decimal amount handling
 */

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
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
}));

// Mock nanoid to return predictable IDs
jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "test-nanoid-123"),
}));

describe("POST /api/transactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any): NextRequest => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  describe("Successful Transaction Creation", () => {
    it("should create a transaction with all fields", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      const mockTransaction = {
        id: "transaction-123",
        plaidTransactionId: "manual_test-nanoid-123",
        accountId: "account-123",
        name: "Test Purchase",
        amount: new Decimal(50.25),
        date: new Date("2024-01-15"),
        pending: false,
        merchantName: "Test Merchant",
        isoCurrencyCode: "USD",
        authorizedDate: new Date("2024-01-14"),
        plaidCategory: "Shopping",
        plaidSubcategory: "Electronics",
        paymentChannel: "online",
        categoryId: "category-123",
        subcategoryId: "subcategory-123",
        notes: "Test notes",
        isSplit: false,
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (prisma.transaction.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        accountId: "account-123",
        name: "Test Purchase",
        amount: 50.25,
        date: "2024-01-15",
        pending: false,
        merchantName: "Test Merchant",
        isoCurrencyCode: "USD",
        authorizedDate: "2024-01-14",
        plaidCategory: "Shopping",
        plaidSubcategory: "Electronics",
        paymentChannel: "online",
        categoryId: "category-123",
        subcategoryId: "subcategory-123",
        notes: "Test notes",
        tagIds: [],
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockTransaction);
      expect(prisma.plaidAccount.findUnique).toHaveBeenCalledWith({
        where: { id: "account-123" },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          plaidTransactionId: "manual_test-nanoid-123",
          name: "Test Purchase",
          merchantName: "Test Merchant",
          isSplit: false,
        }),
      });
    });

    it("should create a transaction with minimal required fields", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      const mockTransaction = {
        id: "transaction-123",
        plaidTransactionId: "manual_test-nanoid-123",
        accountId: "account-123",
        name: "Minimal Transaction",
        amount: new Decimal(25.00),
        date: new Date("2024-01-15"),
        pending: false,
        merchantName: null,
        isoCurrencyCode: null,
        authorizedDate: null,
        plaidCategory: null,
        plaidSubcategory: null,
        paymentChannel: null,
        categoryId: null,
        subcategoryId: null,
        notes: null,
        isSplit: false,
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (prisma.transaction.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        accountId: "account-123",
        name: "Minimal Transaction",
        amount: 25.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockTransaction);
    });

    it("should create a transaction with tags", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      const mockTransaction = {
        id: "transaction-123",
        plaidTransactionId: "manual_test-nanoid-123",
        accountId: "account-123",
        name: "Tagged Transaction",
        amount: new Decimal(100.00),
        date: new Date("2024-01-15"),
        pending: false,
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (prisma.transaction.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const requestBody = {
        accountId: "account-123",
        name: "Tagged Transaction",
        amount: 100.00,
        date: "2024-01-15",
        pending: false,
        tagIds: ["tag-1", "tag-2"],
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockTransaction);
      expect(prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: "transaction-123", tagId: "tag-1" },
          { transactionId: "transaction-123", tagId: "tag-2" },
        ],
      });
    });

    it("should handle Prisma.Decimal amounts correctly", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      const mockTransaction = {
        id: "transaction-123",
        plaidTransactionId: "manual_test-nanoid-123",
        accountId: "account-123",
        name: "Decimal Test",
        amount: new Decimal(123.456789),
        date: new Date("2024-01-15"),
        pending: false,
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (prisma.transaction.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        accountId: "account-123",
        name: "Decimal Test",
        amount: 123.456789,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);

      expect(response.status).toBe(201);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: expect.any(Decimal),
        }),
      });
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 for missing required field (accountId)", async () => {
      const requestBody = {
        // accountId missing
        name: "Test Transaction",
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
      expect(data).toHaveProperty("details");
    });

    it("should return 400 for missing required field (name)", async () => {
      const requestBody = {
        accountId: "account-123",
        // name missing
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for empty name string", async () => {
      const requestBody = {
        accountId: "account-123",
        name: "", // empty string
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid amount type", async () => {
      const requestBody = {
        accountId: "account-123",
        name: "Test Transaction",
        amount: "invalid", // should be number
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid pending type", async () => {
      const requestBody = {
        accountId: "account-123",
        name: "Test Transaction",
        amount: 50.00,
        date: "2024-01-15",
        pending: "false", // should be boolean
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid JSON body", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest;

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });
  });

  describe("Account Not Found", () => {
    it("should return 404 when account does not exist", async () => {
      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(null);

      const requestBody = {
        accountId: "nonexistent-account",
        name: "Test Transaction",
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Account not found" });
      expect(prisma.plaidAccount.findUnique).toHaveBeenCalledWith({
        where: { id: "nonexistent-account" },
      });
    });
  });

  describe("Prisma Errors", () => {
    it("should return 409 for duplicate plaidTransactionId (P2002)", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );

      const duplicateError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "5.0.0",
        }
      );

      (prisma.transaction.create as jest.Mock).mockRejectedValue(
        duplicateError
      );

      const requestBody = {
        accountId: "account-123",
        name: "Duplicate Transaction",
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data).toEqual({
        error: "A transaction with this ID already exists",
      });
    });

    it("should return 500 for other Prisma errors", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );

      const otherError = new Prisma.PrismaClientKnownRequestError(
        "Some other error",
        {
          code: "P2003",
          clientVersion: "5.0.0",
        }
      );

      (prisma.transaction.create as jest.Mock).mockRejectedValue(otherError);

      const requestBody = {
        accountId: "account-123",
        name: "Test Transaction",
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to create transaction" });
    });
  });

  describe("General Errors", () => {
    it("should return 500 for unexpected errors", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );

      (prisma.transaction.create as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      const requestBody = {
        accountId: "account-123",
        name: "Test Transaction",
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to create transaction" });
    });

    it("should handle errors during tag creation", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      const mockTransaction = {
        id: "transaction-123",
        plaidTransactionId: "manual_test-nanoid-123",
        accountId: "account-123",
        name: "Test Transaction",
        amount: new Decimal(50.00),
        date: new Date("2024-01-15"),
        pending: false,
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (prisma.transaction.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transactionTag.createMany as jest.Mock).mockRejectedValue(
        new Error("Tag creation failed")
      );

      const requestBody = {
        accountId: "account-123",
        name: "Test Transaction",
        amount: 50.00,
        date: "2024-01-15",
        pending: false,
        tagIds: ["tag-1"],
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to create transaction" });
    });
  });

  describe("Date Handling", () => {
    it("should convert ISO date strings to Date objects", async () => {
      const mockAccount = {
        id: "account-123",
        plaidAccountId: "plaid-account-123",
        name: "Test Account",
      };

      const mockTransaction = {
        id: "transaction-123",
        plaidTransactionId: "manual_test-nanoid-123",
        accountId: "account-123",
        name: "Date Test",
        amount: new Decimal(50.00),
        date: new Date("2024-01-15"),
        authorizedDate: new Date("2024-01-14"),
        pending: false,
      };

      (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (prisma.transaction.create as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        accountId: "account-123",
        name: "Date Test",
        amount: 50.00,
        date: "2024-01-15",
        authorizedDate: "2024-01-14",
        pending: false,
      };

      const req = createMockRequest(requestBody);
      const response = await POST(req);

      expect(response.status).toBe(201);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date: expect.any(Date),
          authorizedDate: expect.any(Date),
        }),
      });
    });
  });
});
