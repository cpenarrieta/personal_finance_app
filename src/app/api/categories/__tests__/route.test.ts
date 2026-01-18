/**
 * Unit tests for Categories API endpoint
 *
 * Tests cover:
 * 1. Successful category fetching with subcategories
 * 2. Error handling for database failures
 * 3. Empty result sets
 */

import { GET } from "../route"
import { fetchQuery } from "convex/nextjs"

const mockFetchQuery = fetchQuery as jest.MockedFunction<typeof fetchQuery>

describe("Categories API - GET", () => {
  const mockCategories = [
    {
      _id: "cat-1",
      name: "Food & Dining",
      imageUrl: null,
      groupType: "EXPENSES",
      displayOrder: 1,
      subcategories: [
        {
          _id: "subcat-1",
          categoryId: "cat-1",
          name: "Restaurants",
          imageUrl: null,
        },
        {
          _id: "subcat-2",
          categoryId: "cat-1",
          name: "Groceries",
          imageUrl: null,
        },
      ],
    },
    {
      _id: "cat-2",
      name: "Transportation",
      imageUrl: null,
      groupType: "EXPENSES",
      displayOrder: 2,
      subcategories: [
        {
          _id: "subcat-3",
          categoryId: "cat-2",
          name: "Gas",
          imageUrl: null,
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
      mockFetchQuery.mockResolvedValue(mockCategories)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(mockCategories.length)
      expect(data.data[0]?.name).toBe(mockCategories[0]?.name)
      expect(data.data[0]?.subcategories).toHaveLength(mockCategories[0]?.subcategories.length ?? 0)
    })

    it("should return empty array when no categories exist", async () => {
      mockFetchQuery.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it("should return categories with empty subcategories array", async () => {
      const categoriesWithoutSubcategories = [
        {
          _id: "cat-1",
          name: "Category Without Subcategories",
          imageUrl: null,
          groupType: "EXPENSES",
          displayOrder: 1,
          subcategories: [],
        },
      ]
      mockFetchQuery.mockResolvedValue(categoriesWithoutSubcategories)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data[0]?.name).toBe("Category Without Subcategories")
      expect(data.data[0]?.subcategories).toEqual([])
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      const dbError = new Error("Database connection failed")
      mockFetchQuery.mockRejectedValue(dbError)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to fetch categories")
    })

    it("should handle database timeout errors", async () => {
      const timeoutError = new Error("Query timeout")
      mockFetchQuery.mockRejectedValue(timeoutError)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to fetch categories")
    })

    it("should handle unexpected errors gracefully", async () => {
      mockFetchQuery.mockRejectedValue("Unexpected error string")

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to fetch categories")
    })
  })

  describe("Data Structure Validation", () => {
    it("should include all expected fields in category objects", async () => {
      mockFetchQuery.mockResolvedValue(mockCategories)

      const response = await GET()
      const data = await response.json()

      expect(data.data[0]).toHaveProperty("_id")
      expect(data.data[0]).toHaveProperty("name")
      expect(data.data[0]).toHaveProperty("imageUrl")
      expect(data.data[0]).toHaveProperty("groupType")
      expect(data.data[0]).toHaveProperty("subcategories")
    })

    it("should include all expected fields in subcategory objects", async () => {
      mockFetchQuery.mockResolvedValue(mockCategories)

      const response = await GET()
      const data = await response.json()

      const subcategory = data.data[0].subcategories[0]
      expect(subcategory).toHaveProperty("_id")
      expect(subcategory).toHaveProperty("categoryId")
      expect(subcategory).toHaveProperty("name")
      expect(subcategory).toHaveProperty("imageUrl")
    })
  })
})
