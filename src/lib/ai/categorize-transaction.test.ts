import { categorizeTransaction, categorizeTransactions } from "./categorize-transaction"
import { generateObject } from "ai"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import type { Id } from "../../../convex/_generated/dataModel"

// Mock Convex
jest.mock("convex/nextjs", () => ({
  fetchQuery: jest.fn(),
  fetchMutation: jest.fn(),
}))

// AI SDK v6
jest.mock("ai", () => ({
  generateObject: jest.fn(),
}))

jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => jest.fn()),
}))

describe("categorizeTransaction", () => {
  const mockTransactionId = "tx_123" as Id<"transactions">

  const mockTransaction = {
    id: mockTransactionId,
    name: "Uber Ride",
    merchantName: "Uber",
    amount: 25.5,
    datetime: "2023-10-01T10:00:00Z",
    plaidCategory: "Transport",
    plaidSubcategory: "Taxi",
    notes: null,
  }

  const mockCategories = [
    {
      id: "cat_transport" as Id<"categories">,
      name: "Transport",
      groupType: null,
      displayOrder: 1,
      subcategories: [{ id: "sub_taxi" as Id<"subcategories">, name: "Taxi" }],
    },
    {
      id: "cat_food" as Id<"categories">,
      name: "Food",
      groupType: null,
      displayOrder: 2,
      subcategories: [{ id: "sub_groceries" as Id<"subcategories">, name: "Groceries" }],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("successfully categorizes a transaction with high confidence", async () => {
    // Mock Convex queries
    ;(fetchQuery as jest.Mock).mockImplementation((api) => {
      const apiName = api?.toString() || ""
      if (apiName.includes("getTransactionForCategorization")) {
        return Promise.resolve(mockTransaction)
      }
      if (apiName.includes("getAllCategoriesWithSubcategories")) {
        return Promise.resolve(mockCategories)
      }
      if (apiName.includes("getSimilarTransactions") || apiName.includes("getRecentCategorizedTransactions")) {
        return Promise.resolve([])
      }
      return Promise.resolve(null)
    })
    ;(fetchMutation as jest.Mock).mockResolvedValue(undefined)

    // Mock AI response
    ;(generateObject as jest.Mock).mockResolvedValue({
      object: {
        categoryId: "cat_transport",
        subcategoryId: "sub_taxi",
        confidence: 95,
        reasoning: "Matches merchant name and Plaid category",
      },
    })

    const result = await categorizeTransaction(mockTransactionId)

    expect(result).toEqual({
      categoryId: "cat_transport",
      subcategoryId: "sub_taxi",
      confidence: 95,
      reasoning: "Matches merchant name and Plaid category",
    })

    // Verify AI was called with correct model
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: expect.any(Object),
        prompt: expect.stringContaining("Uber Ride"),
      }),
    )
  })

  it("returns null when confidence is low", async () => {
    ;(fetchQuery as jest.Mock).mockImplementation((api) => {
      const apiName = api?.toString() || ""
      if (apiName.includes("getTransactionForCategorization")) {
        return Promise.resolve(mockTransaction)
      }
      if (apiName.includes("getAllCategoriesWithSubcategories")) {
        return Promise.resolve(mockCategories)
      }
      return Promise.resolve([])
    })
    ;(generateObject as jest.Mock).mockResolvedValue({
      object: {
        categoryId: "cat_transport",
        subcategoryId: null,
        confidence: 50, // Below threshold
        reasoning: "Unsure",
      },
    })

    const result = await categorizeTransaction(mockTransactionId)

    expect(result).toBeNull()
  })

  it("returns null when AI suggests invalid category ID", async () => {
    ;(fetchQuery as jest.Mock).mockImplementation((api) => {
      const apiName = api?.toString() || ""
      if (apiName.includes("getTransactionForCategorization")) {
        return Promise.resolve(mockTransaction)
      }
      if (apiName.includes("getAllCategoriesWithSubcategories")) {
        return Promise.resolve(mockCategories)
      }
      return Promise.resolve([])
    })
    ;(generateObject as jest.Mock).mockResolvedValue({
      object: {
        categoryId: "invalid_id",
        subcategoryId: null,
        confidence: 90,
        reasoning: "Hallucinated ID",
      },
    })

    const result = await categorizeTransaction(mockTransactionId)

    expect(result).toBeNull()
  })

  it("handles errors gracefully", async () => {
    ;(fetchQuery as jest.Mock).mockRejectedValue(new Error("DB Error"))

    const result = await categorizeTransaction(mockTransactionId)

    expect(result).toBeNull()
  })
})

describe("categorizeTransactions (Bulk)", () => {
  const mockTxIds = ["tx_1" as Id<"transactions">, "tx_2" as Id<"transactions">]

  const mockTx1 = {
    id: "tx_1" as Id<"transactions">,
    name: "Uber",
    merchantName: "Uber",
    amount: 20,
    datetime: new Date().toISOString(),
  }

  const mockTx2 = {
    id: "tx_2" as Id<"transactions">,
    name: "Kroger",
    merchantName: "Kroger",
    amount: 50,
    datetime: new Date().toISOString(),
  }

  const mockCategories = [
    { id: "c1" as Id<"categories">, name: "Cat 1", groupType: null, displayOrder: 1, subcategories: [] },
    { id: "c2" as Id<"categories">, name: "Cat 2", groupType: null, displayOrder: 2, subcategories: [] },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("processes transactions in chunks", async () => {
    ;(fetchQuery as jest.Mock).mockImplementation((api) => {
      const apiName = api?.toString() || ""
      if (apiName.includes("getAllCategoriesWithSubcategories")) {
        return Promise.resolve(mockCategories)
      }
      if (apiName.includes("getUncategorizedTransactions")) {
        return Promise.resolve([mockTx1, mockTx2])
      }
      if (apiName.includes("getRecentCategorizedTransactions")) {
        return Promise.resolve([])
      }
      return Promise.resolve([])
    })
    ;(fetchMutation as jest.Mock).mockResolvedValue(undefined)

    // Mock AI batch response
    ;(generateObject as jest.Mock).mockResolvedValue({
      object: {
        results: [
          { transactionIndex: 0, categoryId: "c1", subcategoryId: null, confidence: 90, reasoning: "r1" },
          { transactionIndex: 1, categoryId: "c2", subcategoryId: null, confidence: 85, reasoning: "r2" },
        ],
      },
    })

    await categorizeTransactions(mockTxIds)

    // Verify updates happened (successful categorization)
    expect(fetchMutation).toHaveBeenCalled()
  })
})
