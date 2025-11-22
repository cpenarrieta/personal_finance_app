import { categorizeTransaction, categorizeTransactions } from "./categorize-transaction"
import { prisma } from "@/lib/db/prisma"
import { generateObject } from "ai"

// Mock dependencies
jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    transaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    tag: {
      upsert: jest.fn(),
    },
  },
}))

jest.mock("ai", () => ({
  generateObject: jest.fn(),
}))

jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => jest.fn()),
}))

describe("categorizeTransaction", () => {
  const mockTransaction = {
    id: "tx_123",
    name: "Uber Ride",
    merchantName: "Uber",
    amount: { toNumber: () => 25.5 },
    date: new Date("2023-10-01"),
    datetime: new Date("2023-10-01T10:00:00Z"),
    plaidCategory: "Transport",
    plaidSubcategory: "Taxi",
    notes: null,
  }

  const mockCategories = [
    {
      id: "cat_transport",
      name: "Transport",
      subcategories: [{ id: "sub_taxi", name: "Taxi" }],
    },
    {
      id: "cat_food",
      name: "Food",
      subcategories: [{ id: "sub_groceries", name: "Groceries" }],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("successfully categorizes a transaction with high confidence", async () => {
    // Mock Prisma responses
    ;(prisma.transaction.findUnique as jest.Mock).mockResolvedValueOnce(mockTransaction)
    ;(prisma.category.findMany as jest.Mock).mockResolvedValueOnce(mockCategories)
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([]) // similar transactions
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([]) // recent history
    ;(prisma.tag.upsert as jest.Mock).mockResolvedValue({ id: "tag_review" })

    // Mock AI response
    ;(generateObject as jest.Mock).mockResolvedValue({
      object: {
        categoryId: "cat_transport",
        subcategoryId: "sub_taxi",
        confidence: 95,
        reasoning: "Matches merchant name and Plaid category",
      },
    })

    const result = await categorizeTransaction("tx_123")

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
    ;(prisma.transaction.findUnique as jest.Mock).mockResolvedValueOnce(mockTransaction)
    ;(prisma.category.findMany as jest.Mock).mockResolvedValueOnce(mockCategories)
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
    ;(generateObject as jest.Mock).mockResolvedValue({
      object: {
        categoryId: "cat_transport",
        subcategoryId: null,
        confidence: 50, // Below threshold
        reasoning: "Unsure",
      },
    })

    const result = await categorizeTransaction("tx_123")

    expect(result).toBeNull()
  })

  it("returns null when AI suggests invalid category ID", async () => {
    ;(prisma.transaction.findUnique as jest.Mock).mockResolvedValueOnce(mockTransaction)
    ;(prisma.category.findMany as jest.Mock).mockResolvedValueOnce(mockCategories)
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
    ;(generateObject as jest.Mock).mockResolvedValue({
      object: {
        categoryId: "invalid_id",
        subcategoryId: null,
        confidence: 90,
        reasoning: "Hallucinated ID",
      },
    })

    const result = await categorizeTransaction("tx_123")

    expect(result).toBeNull()
  })

  it("handles errors gracefully", async () => {
    ;(prisma.transaction.findUnique as jest.Mock).mockRejectedValue(new Error("DB Error"))

    const result = await categorizeTransaction("tx_123")

    expect(result).toBeNull()
  })
})

describe("categorizeTransactions (Bulk)", () => {
  const mockTxIds = ["tx_1", "tx_2"]

  const mockTx1 = {
    id: "tx_1",
    name: "Uber",
    merchantName: "Uber",
    amount: { toNumber: () => 20 },
    date: new Date(),
    datetime: new Date(),
  }

  const mockTx2 = {
    id: "tx_2",
    name: "Kroger",
    merchantName: "Kroger",
    amount: { toNumber: () => 50 },
    date: new Date(),
    datetime: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("processes transactions in chunks", async () => {
    // Mock categories that match what the AI will return
    const mockCategories = [
      { id: "c1", name: "Cat 1", subcategories: [] },
      { id: "c2", name: "Cat 2", subcategories: [] },
    ]

    // Mock shared context calls
    ;(prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([]) // history
    ;(prisma.tag.upsert as jest.Mock).mockResolvedValue({ id: "tag_review" })

    // Mock per-transaction calls with deterministic implementation
    ;(prisma.transaction.findUnique as jest.Mock).mockImplementation((args) => {
      const id = args.where.id

      // Check if this is the "check existing category" call (has specific select)
      if (args.select && Object.keys(args.select).length === 1 && args.select.categoryId) {
        return Promise.resolve(null) // Not categorized yet
      }

      // Otherwise it's the main fetch
      if (id === "tx_1") return Promise.resolve(mockTx1)
      if (id === "tx_2") return Promise.resolve(mockTx2)

      return Promise.resolve(null)
    })

    // Mock similar transactions for each
    ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])

    // Mock AI responses
    ;(generateObject as jest.Mock)
      .mockResolvedValueOnce({
        object: { categoryId: "c1", subcategoryId: null, confidence: 90, reasoning: "r1" },
      })
      .mockResolvedValueOnce({
        object: { categoryId: "c2", subcategoryId: null, confidence: 85, reasoning: "r2" },
      })

    await categorizeTransactions(mockTxIds)

    // Verify initial shared fetches
    expect(prisma.category.findMany).toHaveBeenCalledTimes(1)

    // Verify processing (Fetch + Check Existing for each = 4 calls)
    expect(prisma.transaction.findUnique).toHaveBeenCalledTimes(4)

    // Verify updates happened (successful categorization)
    expect(prisma.transaction.update).toHaveBeenCalledTimes(2)
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tx_1" }, data: expect.objectContaining({ categoryId: "c1" }) }),
    )
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tx_2" }, data: expect.objectContaining({ categoryId: "c2" }) }),
    )
  })
})
