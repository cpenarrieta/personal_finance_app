/**
 * Unit tests for Categories API endpoint
 *
 * Tests cover:
 * 1. Successful category fetching with subcategories
 * 2. Error handling for database failures
 * 3. Empty result sets
 * 4. Proper ordering of categories and subcategories
 */

import { GET } from "../route"
import * as prismaModule from "@/lib/db/prisma"

// Mock modules
jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
  },
}))

describe("Categories API - GET", () => {
  const mockCategories = [
    {
      id: "cat-1",
      name: "🍔 Food & Dining",
      imageUrl: null,
      isTransferCategory: false,
      groupType: "EXPENSE",
      displayOrder: 1,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      subcategories: [
        {
          id: "subcat-1",
          categoryId: "cat-1",
          name: "Restaurants",
          imageUrl: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "subcat-2",
          categoryId: "cat-1",
          name: "Groceries",
          imageUrl: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ],
    },
    {
      id: "cat-2",
      name: "🚗 Transportation",
      imageUrl: null,
      isTransferCategory: false,
      groupType: "EXPENSE",
      displayOrder: 2,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      subcategories: [
        {
          id: "subcat-3",
          categoryId: "cat-2",
          name: "Gas",
          imageUrl: null,
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
      ],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("Successful Requests", () => {
    it("should return all categories with subcategories", async () => {
      // Arrange
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      // Dates are serialized to strings in JSON response, so check structure instead
      expect(data).toHaveLength(mockCategories.length)
      expect(data[0]?.name).toBe(mockCategories[0]?.name)
      expect(data[0]?.subcategories).toHaveLength(mockCategories[0]?.subcategories.length ?? 0)
      expect(prismaModule.prisma.category.findMany).toHaveBeenCalledWith({
        include: {
          subcategories: {
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      })
    })

    it("should return empty array when no categories exist", async () => {
      // Arrange
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([])

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it("should return categories with empty subcategories array", async () => {
      // Arrange
      const categoriesWithoutSubcategories = [
        {
          id: "cat-1",
          name: "Category Without Subcategories",
          imageUrl: null,
          isTransferCategory: false,
          groupType: "EXPENSE",
          displayOrder: 1,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          subcategories: [],
        },
      ]
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue(categoriesWithoutSubcategories)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0]?.name).toBe("Category Without Subcategories")
      expect(data[0]?.subcategories).toEqual([])
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      // Arrange
      const dbError = new Error("Database connection failed")
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockRejectedValue(dbError)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to fetch categories" })
      expect(console.error).toHaveBeenCalledWith("Error fetching categories:", dbError)
    })

    it("should handle database timeout errors", async () => {
      // Arrange
      const timeoutError = new Error("Query timeout")
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockRejectedValue(timeoutError)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to fetch categories" })
      expect(console.error).toHaveBeenCalledWith("Error fetching categories:", timeoutError)
    })

    it("should handle unexpected errors gracefully", async () => {
      // Arrange
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockRejectedValue("Unexpected error string")

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to fetch categories" })
    })
  })

  describe("Data Structure Validation", () => {
    it("should include all expected fields in category objects", async () => {
      // Arrange
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(data[0]).toHaveProperty("id")
      expect(data[0]).toHaveProperty("name")
      expect(data[0]).toHaveProperty("imageUrl")
      expect(data[0]).toHaveProperty("isTransferCategory")
      expect(data[0]).toHaveProperty("subcategories")
    })

    it("should include all expected fields in subcategory objects", async () => {
      // Arrange
      ;(prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      const subcategory = data[0].subcategories[0]
      expect(subcategory).toHaveProperty("id")
      expect(subcategory).toHaveProperty("categoryId")
      expect(subcategory).toHaveProperty("name")
      expect(subcategory).toHaveProperty("imageUrl")
    })
  })
})
