/**
 * @jest-environment node
 *
 * Unit tests for POST /api/categorize
 *
 * Tests cover:
 * 1. Successful categorization with OpenAI
 * 2. Batch processing (20 transactions at a time)
 * 3. Confidence threshold (>50) filtering
 * 4. Category/subcategory matching
 * 5. No transactions to categorize
 * 6. OpenAI API errors
 * 7. Database errors
 * 8. Skipped transactions (low confidence, no match)
 */

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("POST /api/categorize", () => {
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked OpenAI instance
    mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>;
  });

  const mockCategories = [
    {
      id: "cat-1",
      name: "🍔 Food & Dining",
      subcategories: [
        { id: "sub-1", name: "Restaurants" },
        { id: "sub-2", name: "Groceries" },
      ],
    },
    {
      id: "cat-2",
      name: "🚗 Transportation",
      subcategories: [
        { id: "sub-3", name: "Gas" },
        { id: "sub-4", name: "Uber/Lyft" },
      ],
    },
    {
      id: "cat-3",
      name: "💼 Income",
      subcategories: [{ id: "sub-5", name: "Salary" }],
    },
  ];

  const mockUncategorizedTransactions = [
    {
      id: "txn-1",
      name: "Starbucks Coffee",
      merchantName: "Starbucks",
      plaidCategory: "Food and Drink",
      plaidSubcategory: "Restaurants",
      notes: null,
      amount: new Decimal(5.75),
    },
    {
      id: "txn-2",
      name: "Uber Trip",
      merchantName: "Uber",
      plaidCategory: "Transportation",
      plaidSubcategory: "Taxi",
      notes: "Ride to airport",
      amount: new Decimal(25.00),
    },
  ];

  describe("Successful Categorization", () => {
    it("should categorize transactions with high confidence", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(
        mockUncategorizedTransactions
      );
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      // Mock OpenAI response
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: "🍔 Food & Dining",
                    subcategoryName: "Restaurants",
                    confidence: 95,
                    reasoning: "Coffee shop purchase",
                  },
                  {
                    transactionIndex: 1,
                    categoryName: "🚗 Transportation",
                    subcategoryName: "Uber/Lyft",
                    confidence: 98,
                    reasoning: "Ride sharing service",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: "Categorized 2 transactions",
        total: 2,
        categorized: 2,
        skipped: 0,
      });

      expect(prisma.transaction.update).toHaveBeenCalledTimes(2);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "txn-1" },
        data: {
          category: { connect: { id: "cat-1" } },
          subcategory: { connect: { id: "sub-1" } },
        },
      });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "txn-2" },
        data: {
          category: { connect: { id: "cat-2" } },
          subcategory: { connect: { id: "sub-4" } },
        },
      });
    });

    it("should categorize without subcategory if not provided", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: "🍔 Food & Dining",
                    subcategoryName: null,
                    confidence: 90,
                    reasoning: "Food purchase, subcategory unclear",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: "Categorized 1 transactions",
        total: 1,
        categorized: 1,
        skipped: 0,
      });

      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "txn-1" },
        data: {
          category: { connect: { id: "cat-1" } },
          subcategory: { disconnect: true },
        },
      });
    });

    it("should return success when no transactions to categorize", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: "No transactions to categorize",
        categorized: 0,
        skipped: 0,
      });

      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });
  });

  describe("Confidence Threshold and Skipping", () => {
    it("should skip transactions with confidence <= 50", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
        mockUncategorizedTransactions[1],
      ]);
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: "🍔 Food & Dining",
                    subcategoryName: "Restaurants",
                    confidence: 45, // Below threshold
                    reasoning: "Not sure",
                  },
                  {
                    transactionIndex: 1,
                    categoryName: "🚗 Transportation",
                    subcategoryName: "Uber/Lyft",
                    confidence: 95, // Above threshold
                    reasoning: "Clear match",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(data).toEqual({
        success: true,
        message: "Categorized 1 transactions",
        total: 2,
        categorized: 1,
        skipped: 1,
      });

      expect(prisma.transaction.update).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "txn-2" },
        data: {
          category: { connect: { id: "cat-2" } },
          subcategory: { connect: { id: "sub-4" } },
        },
      });
    });

    it("should skip transactions with no category match", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: "🏠 Housing", // Category doesn't exist
                    subcategoryName: "Rent",
                    confidence: 95,
                    reasoning: "Rent payment",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(data).toEqual({
        success: true,
        message: "Categorized 0 transactions",
        total: 1,
        categorized: 0,
        skipped: 1,
      });

      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });

    it("should skip transactions with null category name", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: null,
                    subcategoryName: null,
                    confidence: 95,
                    reasoning: "Can't determine category",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(data).toEqual({
        success: true,
        message: "Categorized 0 transactions",
        total: 1,
        categorized: 0,
        skipped: 1,
      });

      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });
  });

  describe("Batch Processing", () => {
    it("should process transactions in batches of 20", async () => {
      const largeTransactionSet = Array.from({ length: 45 }, (_, i) => ({
        id: `txn-${i}`,
        name: `Transaction ${i}`,
        merchantName: null,
        plaidCategory: null,
        plaidSubcategory: null,
        notes: null,
        amount: new Decimal(10.00),
      }));

      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(
        largeTransactionSet
      );
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [],
              }),
            },
          },
        ],
      });

      await POST();

      // Should be called 3 times: 20, 20, 5
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe("OpenAI Response Parsing", () => {
    it("should handle response with 'transactions' key", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transactions: [
                  {
                    transactionIndex: 0,
                    categoryName: "🍔 Food & Dining",
                    subcategoryName: "Restaurants",
                    confidence: 95,
                    reasoning: "Coffee shop",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(data.categorized).toBe(1);
    });

    it("should handle response as direct array", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  transactionIndex: 0,
                  categoryName: "🍔 Food & Dining",
                  subcategoryName: "Restaurants",
                  confidence: 95,
                  reasoning: "Coffee shop",
                },
              ]),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(data.categorized).toBe(1);
    });

    it("should handle OpenAI API returning empty response", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      // Should skip all when OpenAI fails
      expect(data.categorized).toBe(0);
      expect(data.skipped).toBe(1);
    });

    it("should handle OpenAI API errors gracefully", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);

      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error("OpenAI API error")
      );

      const response = await POST();
      const data = await response.json();

      // Should skip all when OpenAI fails
      expect(data.categorized).toBe(0);
      expect(data.skipped).toBe(1);
    });
  });

  describe("Database Errors", () => {
    it("should return 500 when category fetch fails", async () => {
      (prisma.category.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: "Failed to categorize transactions",
        details: "Database error",
      });
    });

    it("should return 500 when transaction fetch fails", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockRejectedValue(
        new Error("Transaction fetch error")
      );

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: "Failed to categorize transactions",
        details: "Transaction fetch error",
      });
    });

    it("should return 500 when transaction update fails", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);
      (prisma.transaction.update as jest.Mock).mockRejectedValue(
        new Error("Update error")
      );

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: "🍔 Food & Dining",
                    subcategoryName: "Restaurants",
                    confidence: 95,
                    reasoning: "Coffee shop",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: "Failed to categorize transactions",
        details: "Update error",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing confidence field (defaults to 0)", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: "🍔 Food & Dining",
                    subcategoryName: "Restaurants",
                    // confidence missing
                    reasoning: "Coffee shop",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      // Should skip because confidence defaults to 0 (≤ 50)
      expect(data.categorized).toBe(0);
      expect(data.skipped).toBe(1);
    });

    it("should handle subcategory that doesn't exist in category", async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockUncategorizedTransactions[0],
      ]);
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    transactionIndex: 0,
                    categoryName: "🍔 Food & Dining",
                    subcategoryName: "NonexistentSub",
                    confidence: 95,
                    reasoning: "Food purchase",
                  },
                ],
              }),
            },
          },
        ],
      });

      const response = await POST();
      const data = await response.json();

      // Should still categorize with category only
      expect(data.categorized).toBe(1);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "txn-1" },
        data: {
          category: { connect: { id: "cat-1" } },
          subcategory: { disconnect: true },
        },
      });
    });
  });
});
