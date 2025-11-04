/**
 * @jest-environment node
 *
 * Unit tests for PATCH /api/transactions/bulk-update
 *
 * Tests cover:
 * 1. Successful bulk update of category/subcategory
 * 2. Successful bulk update of tags (delete old, create new)
 * 3. Bulk update with empty tag array (remove all tags)
 * 4. Update multiple transactions at once
 * 5. Validation errors (empty transactionIds, invalid data)
 * 6. Database errors
 */

import { PATCH } from "../route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      updateMany: jest.fn(),
    },
    transactionTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

describe("PATCH /api/transactions/bulk-update", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any): NextRequest => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  describe("Successful Bulk Updates", () => {
    it("should update category for multiple transactions", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2", "txn-3"],
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        updatedCount: 3,
      });
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ["txn-1", "txn-2", "txn-3"],
          },
        },
        data: {
          categoryId: "category-123",
          subcategoryId: undefined,
        },
      });
    });

    it("should update subcategory for multiple transactions", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        subcategoryId: "subcategory-456",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        updatedCount: 2,
      });
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ["txn-1", "txn-2"],
          },
        },
        data: {
          categoryId: undefined,
          subcategoryId: "subcategory-456",
        },
      });
    });

    it("should update both category and subcategory", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2", "txn-3", "txn-4", "txn-5"],
        categoryId: "category-123",
        subcategoryId: "subcategory-456",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        updatedCount: 5,
      });
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ["txn-1", "txn-2", "txn-3", "txn-4", "txn-5"],
          },
        },
        data: {
          categoryId: "category-123",
          subcategoryId: "subcategory-456",
        },
      });
    });

    it("should set category to null", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        categoryId: null,
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);

      expect(response.status).toBe(200);
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ["txn-1", "txn-2"],
          },
        },
        data: {
          categoryId: null,
          subcategoryId: undefined,
        },
      });
    });

    it("should update a single transaction", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const requestBody = {
        transactionIds: ["txn-1"],
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        updatedCount: 1,
      });
    });
  });

  describe("Tag Updates", () => {
    it("should replace tags for multiple transactions", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });
      (prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 6,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2", "txn-3"],
        tagIds: ["tag-1", "tag-2"],
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        updatedCount: 3,
      });

      // Should delete all existing tags for these transactions
      expect(prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: {
          transactionId: {
            in: ["txn-1", "txn-2", "txn-3"],
          },
        },
      });

      // Should create new tags (3 transactions × 2 tags = 6 associations)
      expect(prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: "txn-1", tagId: "tag-1" },
          { transactionId: "txn-1", tagId: "tag-2" },
          { transactionId: "txn-2", tagId: "tag-1" },
          { transactionId: "txn-2", tagId: "tag-2" },
          { transactionId: "txn-3", tagId: "tag-1" },
          { transactionId: "txn-3", tagId: "tag-2" },
        ],
      });
    });

    it("should remove all tags when tagIds is empty array", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        tagIds: [],
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);

      expect(response.status).toBe(200);
      expect(prisma.transactionTag.deleteMany).toHaveBeenCalledWith({
        where: {
          transactionId: {
            in: ["txn-1", "txn-2"],
          },
        },
      });
      expect(prisma.transactionTag.createMany).not.toHaveBeenCalled();
    });

    it("should not modify tags when tagIds is undefined", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        categoryId: "category-123",
        // tagIds is undefined
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);

      expect(response.status).toBe(200);
      expect(prisma.transactionTag.deleteMany).not.toHaveBeenCalled();
      expect(prisma.transactionTag.createMany).not.toHaveBeenCalled();
    });

    it("should update both category and tags together", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        categoryId: "category-123",
        subcategoryId: "subcategory-456",
        tagIds: ["tag-1"],
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);

      expect(response.status).toBe(200);
      expect(prisma.transaction.updateMany).toHaveBeenCalled();
      expect(prisma.transactionTag.deleteMany).toHaveBeenCalled();
      expect(prisma.transactionTag.createMany).toHaveBeenCalled();
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 for empty transactionIds array", async () => {
      const requestBody = {
        transactionIds: [],
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for missing transactionIds", async () => {
      const requestBody = {
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid transactionIds type", async () => {
      const requestBody = {
        transactionIds: "txn-1",
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid tagIds type", async () => {
      const requestBody = {
        transactionIds: ["txn-1"],
        tagIds: "tag-1", // should be array
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 for invalid JSON body", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest;

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Invalid request data");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when transaction update fails", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to bulk update transactions" });
    });

    it("should return 500 when tag deletion fails", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockRejectedValue(
        new Error("Tag deletion error")
      );

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        tagIds: ["tag-1"],
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to bulk update transactions" });
    });

    it("should return 500 when tag creation fails", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.transactionTag.createMany as jest.Mock).mockRejectedValue(
        new Error("Tag creation error")
      );

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        tagIds: ["tag-1"],
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to bulk update transactions" });
    });
  });

  describe("Edge Cases", () => {
    it("should handle large number of transactions", async () => {
      const transactionIds = Array.from({ length: 100 }, (_, i) => `txn-${i}`);

      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 100,
      });

      const requestBody = {
        transactionIds,
        categoryId: "category-123",
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        updatedCount: 100,
      });
    });

    it("should handle update with only tagIds (no category/subcategory)", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2"],
        tagIds: ["tag-1"],
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);

      expect(response.status).toBe(200);
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ["txn-1", "txn-2"],
          },
        },
        data: {
          categoryId: undefined,
          subcategoryId: undefined,
        },
      });
    });

    it("should handle multiple tags for multiple transactions", async () => {
      (prisma.transaction.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });
      (prisma.transactionTag.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });
      (prisma.transactionTag.createMany as jest.Mock).mockResolvedValue({
        count: 9,
      });

      const requestBody = {
        transactionIds: ["txn-1", "txn-2", "txn-3"],
        tagIds: ["tag-1", "tag-2", "tag-3"],
      };

      const req = createMockRequest(requestBody);
      const response = await PATCH(req);

      expect(response.status).toBe(200);
      // 3 transactions × 3 tags = 9 associations
      expect(prisma.transactionTag.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { transactionId: "txn-1", tagId: "tag-1" },
          { transactionId: "txn-1", tagId: "tag-2" },
          { transactionId: "txn-1", tagId: "tag-3" },
          { transactionId: "txn-2", tagId: "tag-1" },
          { transactionId: "txn-2", tagId: "tag-2" },
          { transactionId: "txn-2", tagId: "tag-3" },
          { transactionId: "txn-3", tagId: "tag-1" },
          { transactionId: "txn-3", tagId: "tag-2" },
          { transactionId: "txn-3", tagId: "tag-3" },
        ]),
      });
    });
  });
});
