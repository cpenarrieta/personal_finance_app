/**
 * Unit tests for Tags API endpoint
 *
 * Tests cover:
 * 1. Successful tag fetching
 * 2. Error handling for database failures
 * 3. Empty result sets
 * 4. Proper ordering of tags
 */

import { GET } from "../route"
import * as prismaModule from "@/lib/db/prisma"

// Mock modules
jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    tag: {
      findMany: jest.fn(),
    },
  },
}))

describe("Tags API - GET", () => {
  const mockTags = [
    {
      id: "tag-1",
      name: "Business",
      color: "#FF5733",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "tag-2",
      name: "Personal",
      color: "#33C1FF",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "tag-3",
      name: "Tax Deductible",
      color: "#4CAF50",
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
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
    it("should return all tags ordered by name", async () => {
      // Arrange
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      // Dates are serialized to strings in JSON response
      expect(data).toHaveLength(mockTags.length)
      expect(data[0]?.name).toBe(mockTags[0]?.name)
      expect(data[1]?.name).toBe(mockTags[1]?.name)
      expect(prismaModule.prisma.tag.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      })
    })

    it("should return empty array when no tags exist", async () => {
      // Arrange
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([])

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it("should return single tag", async () => {
      // Arrange
      const singleTag = [mockTags[0]]
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue(singleTag)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0]?.name).toBe(singleTag[0]?.name)
      expect(data).toHaveLength(1)
    })

    it("should handle tags with special characters in names", async () => {
      // Arrange
      const tagsWithSpecialChars = [
        {
          id: "tag-1",
          name: "Work/Business",
          color: "#FF5733",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "tag-2",
          name: "Tax - Q1 2024",
          color: "#33C1FF",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
      ]
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue(tagsWithSpecialChars)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(tagsWithSpecialChars.length)
      expect(data[0].name).toBe("Work/Business")
      expect(data[1].name).toBe("Tax - Q1 2024")
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      // Arrange
      const dbError = new Error("Database connection failed")
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockRejectedValue(dbError)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to fetch tags" })
      expect(console.error).toHaveBeenCalledWith("Error fetching tags:", dbError)
    })

    it("should handle database timeout errors", async () => {
      // Arrange
      const timeoutError = new Error("Query timeout")
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockRejectedValue(timeoutError)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to fetch tags" })
      expect(console.error).toHaveBeenCalledWith("Error fetching tags:", timeoutError)
    })

    it("should handle unexpected errors gracefully", async () => {
      // Arrange
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockRejectedValue("Unexpected error string")

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to fetch tags" })
    })

    it("should handle null response from database", async () => {
      // Arrange
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue(null)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toBeNull()
    })
  })

  describe("Data Structure Validation", () => {
    it("should include all expected fields in tag objects", async () => {
      // Arrange
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(data[0]).toHaveProperty("id")
      expect(data[0]).toHaveProperty("name")
      expect(data[0]).toHaveProperty("color")
      expect(data[0]).toHaveProperty("createdAt")
      expect(data[0]).toHaveProperty("updatedAt")
    })

    it("should preserve color format", async () => {
      // Arrange
      ;(prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(data[0].color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(data[1].color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(data[2].color).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })
})
