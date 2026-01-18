/**
 * Unit tests for Tags API endpoint
 *
 * Tests cover:
 * 1. Successful tag fetching
 * 2. Error handling for database failures
 * 3. Empty result sets
 */

import { GET } from "../route"
import { fetchQuery } from "convex/nextjs"

// fetchQuery is mocked in jest.setup.js
const mockFetchQuery = fetchQuery as jest.MockedFunction<typeof fetchQuery>

describe("Tags API - GET", () => {
  const mockTags = [
    {
      _id: "tag-1",
      name: "Business",
      color: "#FF5733",
      _creationTime: Date.now(),
    },
    {
      _id: "tag-2",
      name: "Personal",
      color: "#33C1FF",
      _creationTime: Date.now(),
    },
    {
      _id: "tag-3",
      name: "Tax Deductible",
      color: "#4CAF50",
      _creationTime: Date.now(),
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
    it("should return all tags", async () => {
      mockFetchQuery.mockResolvedValue(mockTags)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(mockTags.length)
      expect(data.data[0]?.name).toBe(mockTags[0]?.name)
      expect(data.data[1]?.name).toBe(mockTags[1]?.name)
    })

    it("should return empty array when no tags exist", async () => {
      mockFetchQuery.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it("should return single tag", async () => {
      const singleTag = [mockTags[0]]
      mockFetchQuery.mockResolvedValue(singleTag)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data[0]?.name).toBe(singleTag[0]?.name)
      expect(data.data).toHaveLength(1)
    })

    it("should handle tags with special characters in names", async () => {
      const tagsWithSpecialChars = [
        {
          _id: "tag-1",
          name: "Work/Business",
          color: "#FF5733",
          _creationTime: Date.now(),
        },
        {
          _id: "tag-2",
          name: "Tax - Q1 2024",
          color: "#33C1FF",
          _creationTime: Date.now(),
        },
      ]
      mockFetchQuery.mockResolvedValue(tagsWithSpecialChars)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(tagsWithSpecialChars.length)
      expect(data.data[0].name).toBe("Work/Business")
      expect(data.data[1].name).toBe("Tax - Q1 2024")
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
      expect(data.error).toBe("Failed to fetch tags")
    })

    it("should handle database timeout errors", async () => {
      const timeoutError = new Error("Query timeout")
      mockFetchQuery.mockRejectedValue(timeoutError)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to fetch tags")
    })

    it("should handle unexpected errors gracefully", async () => {
      mockFetchQuery.mockRejectedValue("Unexpected error string")

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to fetch tags")
    })
  })

  describe("Data Structure Validation", () => {
    it("should include all expected fields in tag objects", async () => {
      mockFetchQuery.mockResolvedValue(mockTags)

      const response = await GET()
      const data = await response.json()

      expect(data.data[0]).toHaveProperty("_id")
      expect(data.data[0]).toHaveProperty("name")
      expect(data.data[0]).toHaveProperty("color")
    })

    it("should preserve color format", async () => {
      mockFetchQuery.mockResolvedValue(mockTags)

      const response = await GET()
      const data = await response.json()

      expect(data.data[0].color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(data.data[1].color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(data.data[2].color).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })
})
