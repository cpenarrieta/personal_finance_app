/**
 * @jest-environment node
 *
 * Unit tests for PATCH /api/transactions/[id] and DELETE /api/transactions/[id]
 *
 * PATCH tests cover:
 * 1. Successful transaction update with various fields
 * 2. Update with category/subcategory connect/disconnect
 * 3. Tag replacement (delete all, create new)
 * 4. Validation errors
 * 5. General server errors
 *
 * DELETE tests cover:
 * 1. Successful transaction deletion
 * 2. Transaction not found (404)
 * 3. Cascade delete for split parent (child transactions)
 * 4. Cascade delete for tags
 * 5. General server errors
 */

import { PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    transactionTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

describe("PATCH /api/transactions/[id]", () => {
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

  describe("Successful Updates", () => {
    it("should update transaction name", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Updated Name",
        amount: new Prisma.Decimal(50.00),
        date: new Date("2024-01-15"),
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        name: "Updated Name",
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTransaction);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        data: { name: "Updated Name" },
      });
    });

    it("should update multiple fields at once", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Updated Name",
        plaidCategory: "Food",
        plaidSubcategory: "Groceries",
        notes: "Updated notes",
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        name: "Updated Name",
        plaidCategory: "Food",
        plaidSubcategory: "Groceries",
        notes: "Updated notes",
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTransaction);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        data: {
          name: "Updated Name",
          plaidCategory: "Food",
          plaidSubcategory: "Groceries",
          notes: "Updated notes",
        },
      });
    });

    it("should set fields to null", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Test Transaction",
        plaidCategory: null,
        notes: null,
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        plaidCategory: null,
        notes: null,
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        data: {
          plaidCategory: null,
          notes: null,
        },
      });
    });
  });

  describe("Category and Subcategory Updates", () => {
    it("should connect category when categoryId is provided", async () => {
      const mockTransaction = {
        id: "transaction-123",
        categoryId: "category-123",
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        data: {
          category: { connect: { id: "category-123" } },
        },
      });
    });

    it("should disconnect category when categoryId is null", async () => {
      const mockTransaction = {
        id: "transaction-123",
        categoryId: null,
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        categoryId: null,
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        data: {
          category: { disconnect: true },
        },
      });
    });

    it("should connect subcategory when subcategoryId is provided", async () => {
      const mockTransaction = {
        id: "transaction-123",
        subcategoryId: "subcategory-123",
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        subcategoryId: "subcategory-123",
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        data: {
          subcategory: { connect: { id: "subcategory-123" } },
        },
      });
    });

    it("should disconnect subcategory when subcategoryId is null", async () => {
      const mockTransaction = {
        id: "transaction-123",
        subcategoryId: null,
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        subcategoryId: null,
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        data: {
          subcategory: { disconnect: true },
        },
      });
    });
  });

  describe("Tag Updates", () => {
    it("should replace existing tags with new tags", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Test Transaction",
      };

      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        tagIds: ["tag-1", "tag-2"],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId: "transaction-123" },
      });
      expect(prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: "transaction-123", tagId: "tag-1" },
          { transactionId: "transaction-123", tagId: "tag-2" },
        ],
      });
    });

    it("should remove all tags when tagIds is empty array", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Test Transaction",
      };

      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        tagIds: [],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId: "transaction-123" },
      });
      expect(prisma.transactionTag.createMany).not.toHaveBeenCalled();
    });

    it("should not modify tags when tagIds is undefined", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Updated Name",
      };

      (prisma.transaction.update as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const requestBody = {
        name: "Updated Name",
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(prisma.transactionTag.deleteMany).not.toHaveBeenCalled();
      expect(prisma.transactionTag.createMany).not.toHaveBeenCalled();
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 for invalid JSON body", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest;
      const params = createMockParams("transaction-123");

      const response = await PATCH(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid data types", async () => {
      const requestBody = {
        name: 123, // should be string
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when transaction update fails", async () => {
      (prisma.transaction.update as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const requestBody = {
        name: "Updated Name",
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to update transaction" });
    });

    it("should return 500 when tag deletion fails", async () => {
      (prisma.transactionTag.deleteMany as jest.Mock).mockRejectedValue(
        new Error("Tag deletion error")
      );

      const requestBody = {
        tagIds: ["tag-1"],
      };

      const req = createMockRequest(requestBody);
      const params = createMockParams("transaction-123");
      const response = await PATCH(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to update transaction" });
    });
  });
});

describe("DELETE /api/transactions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (): NextRequest => {
    return {} as NextRequest;
  };

  const createMockParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  describe("Successful Deletion", () => {
    it("should delete a simple transaction without children", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Test Transaction",
        childTransactions: [],
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transaction.delete as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const req = createMockRequest();
      const params = createMockParams("transaction-123");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
        include: { childTransactions: true },
      });
      expect(prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId: "transaction-123" },
      });
      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
      });
    });

    it("should cascade delete child transactions for split parent", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Split Parent",
        childTransactions: [
          { id: "child-1", parentTransactionId: "transaction-123" },
          { id: "child-2", parentTransactionId: "transaction-123" },
        ],
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transaction.deleteMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.transaction.delete as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const req = createMockRequest();
      const params = createMockParams("transaction-123");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { parentTransactionId: "transaction-123" },
      });
      expect(prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: { transactionId: "transaction-123" },
      });
      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: "transaction-123" },
      });
    });

    it("should delete transaction with no tags or children", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Simple Transaction",
        childTransactions: [],
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.transaction.delete as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const req = createMockRequest();
      const params = createMockParams("transaction-123");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });
  });

  describe("Transaction Not Found", () => {
    it("should return 404 when transaction does not exist", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest();
      const params = createMockParams("nonexistent-id");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Transaction not found" });
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: "nonexistent-id" },
        include: { childTransactions: true },
      });
      expect(prisma.transaction.delete).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when findUnique fails", async () => {
      (prisma.transaction.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = createMockRequest();
      const params = createMockParams("transaction-123");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to delete transaction" });
    });

    it("should return 500 when child deletion fails", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Split Parent",
        childTransactions: [
          { id: "child-1", parentTransactionId: "transaction-123" },
        ],
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transaction.deleteMany as jest.Mock).mockRejectedValue(
        new Error("Child deletion error")
      );

      const req = createMockRequest();
      const params = createMockParams("transaction-123");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to delete transaction" });
    });

    it("should return 500 when tag deletion fails", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Test Transaction",
        childTransactions: [],
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transactionTag.deleteMany as jest.Mock).mockRejectedValue(
        new Error("Tag deletion error")
      );

      const req = createMockRequest();
      const params = createMockParams("transaction-123");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to delete transaction" });
    });

    it("should return 500 when transaction deletion fails", async () => {
      const mockTransaction = {
        id: "transaction-123",
        name: "Test Transaction",
        childTransactions: [],
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        mockTransaction
      );
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.transaction.delete as jest.Mock).mockRejectedValue(
        new Error("Delete error")
      );

      const req = createMockRequest();
      const params = createMockParams("transaction-123");
      const response = await DELETE(req, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to delete transaction" });
    });
  });
});
