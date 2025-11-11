/**
 * Unit tests for Transaction URL Params Parser
 *
 * Tests cover:
 * 1. Parsing date ranges and custom dates
 * 2. Parsing category and subcategory filters
 * 3. Parsing account and tag filters
 * 4. Parsing boolean toggles
 * 5. Parsing search and sort parameters
 * 6. Converting filters back to URL params
 */

import {
  parseTransactionFiltersFromUrl,
  transactionFiltersToUrlParams,
  type TransactionFiltersFromUrl,
} from "../url-params"

describe("Transaction URL Params", () => {
  describe("parseTransactionFiltersFromUrl", () => {
    it("should parse date range from URLSearchParams", () => {
      // Arrange
      const params = new URLSearchParams("dateRange=last30")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.dateRange).toBe("last30")
    })

    it("should parse custom dates", () => {
      // Arrange
      const params = new URLSearchParams("dateRange=custom&startDate=2024-01-01&endDate=2024-01-31")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.dateRange).toBe("custom")
      expect(filters.customStartDate).toBe("2024-01-01")
      expect(filters.customEndDate).toBe("2024-01-31")
    })

    it("should parse comma-separated category IDs", () => {
      // Arrange
      const params = new URLSearchParams("categoryId=cat-1,cat-2,cat-3")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.selectedCategoryIds).toBeInstanceOf(Set)
      expect(filters.selectedCategoryIds?.size).toBe(3)
      expect(filters.selectedCategoryIds?.has("cat-1")).toBe(true)
      expect(filters.selectedCategoryIds?.has("cat-2")).toBe(true)
      expect(filters.selectedCategoryIds?.has("cat-3")).toBe(true)
    })

    it("should parse comma-separated subcategory IDs", () => {
      // Arrange
      const params = new URLSearchParams("subcategoryId=sub-1,sub-2")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.selectedSubcategoryIds).toBeInstanceOf(Set)
      expect(filters.selectedSubcategoryIds?.size).toBe(2)
      expect(filters.selectedSubcategoryIds?.has("sub-1")).toBe(true)
      expect(filters.selectedSubcategoryIds?.has("sub-2")).toBe(true)
    })

    it("should parse excluded category IDs", () => {
      // Arrange
      const params = new URLSearchParams("excludeCategory=cat-1,cat-2")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.excludedCategoryIds).toBeInstanceOf(Set)
      expect(filters.excludedCategoryIds?.size).toBe(2)
      expect(filters.excludedCategoryIds?.has("cat-1")).toBe(true)
    })

    it("should parse account IDs", () => {
      // Arrange
      const params = new URLSearchParams("accountId=acc-1,acc-2")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.selectedAccountIds).toBeInstanceOf(Set)
      expect(filters.selectedAccountIds?.size).toBe(2)
    })

    it("should parse tag IDs", () => {
      // Arrange
      const params = new URLSearchParams("tagId=tag-1,tag-2,tag-3")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.selectedTagIds).toBeInstanceOf(Set)
      expect(filters.selectedTagIds?.size).toBe(3)
    })

    it("should parse boolean toggle for showIncome", () => {
      // Arrange
      const paramsTrue = new URLSearchParams("showIncome=true")
      const paramsFalse = new URLSearchParams("showIncome=false")

      // Act
      const filtersTrue = parseTransactionFiltersFromUrl(paramsTrue)
      const filtersFalse = parseTransactionFiltersFromUrl(paramsFalse)

      // Assert
      expect(filtersTrue.showIncome).toBe(true)
      expect(filtersFalse.showIncome).toBe(false)
    })

    it("should parse boolean toggle for showExpenses", () => {
      // Arrange
      const params = new URLSearchParams("showExpenses=true")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.showExpenses).toBe(true)
    })

    it("should parse boolean toggle for showTransfers", () => {
      // Arrange
      const params = new URLSearchParams("showTransfers=true")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.showTransfers).toBe(true)
    })

    it("should parse uncategorized filter", () => {
      // Arrange
      const params = new URLSearchParams("uncategorized=true")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.showOnlyUncategorized).toBe(true)
    })

    it("should parse search query", () => {
      // Arrange
      const params = new URLSearchParams("search=coffee shop")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.searchQuery).toBe("coffee shop")
    })

    it("should parse sort parameters", () => {
      // Arrange
      const params = new URLSearchParams("sortBy=amount&sortDirection=asc")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.sortBy).toBe("amount")
      expect(filters.sortDirection).toBe("asc")
    })

    it("should handle all parameters together", () => {
      // Arrange
      const params = new URLSearchParams(
        "dateRange=last30&categoryId=cat-1&showIncome=false&search=test&sortBy=date&sortDirection=desc",
      )

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.dateRange).toBe("last30")
      expect(filters.selectedCategoryIds?.has("cat-1")).toBe(true)
      expect(filters.showIncome).toBe(false)
      expect(filters.searchQuery).toBe("test")
      expect(filters.sortBy).toBe("date")
      expect(filters.sortDirection).toBe("desc")
    })

    it("should ignore invalid date range values", () => {
      // Arrange
      const params = new URLSearchParams("dateRange=invalid")

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.dateRange).toBeUndefined()
    })

    it("should handle Record format input", () => {
      // Arrange
      const params = {
        dateRange: "last30",
        categoryId: "cat-1,cat-2",
        showIncome: "true",
      }

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.dateRange).toBe("last30")
      expect(filters.selectedCategoryIds?.size).toBe(2)
      expect(filters.showIncome).toBe(true)
    })

    it("should handle array values in Record format", () => {
      // Arrange
      const params = {
        dateRange: ["last30", "last90"], // Takes first value
        categoryId: ["cat-1"],
      }

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(filters.dateRange).toBe("last30")
      expect(filters.selectedCategoryIds?.has("cat-1")).toBe(true)
    })

    it("should return empty object for no parameters", () => {
      // Arrange
      const params = new URLSearchParams()

      // Act
      const filters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(Object.keys(filters).length).toBe(0)
    })
  })

  describe("transactionFiltersToUrlParams", () => {
    it("should convert date range to URL params", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        dateRange: "last30",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("dateRange")).toBe("last30")
    })

    it('should not include "all" date range in params', () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        dateRange: "all",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.has("dateRange")).toBe(false)
    })

    it("should convert custom dates to URL params", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        dateRange: "custom",
        customStartDate: "2024-01-01",
        customEndDate: "2024-01-31",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("dateRange")).toBe("custom")
      expect(params.get("startDate")).toBe("2024-01-01")
      expect(params.get("endDate")).toBe("2024-01-31")
    })

    it("should convert Set of category IDs to comma-separated string", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        selectedCategoryIds: new Set(["cat-1", "cat-2", "cat-3"]),
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      const categoryIds = params.get("categoryId")?.split(",") || []
      expect(categoryIds).toHaveLength(3)
      expect(categoryIds).toContain("cat-1")
      expect(categoryIds).toContain("cat-2")
      expect(categoryIds).toContain("cat-3")
    })

    it("should convert Set of subcategory IDs to comma-separated string", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        selectedSubcategoryIds: new Set(["sub-1", "sub-2"]),
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("subcategoryId")).toBe("sub-1,sub-2")
    })

    it("should convert excluded category IDs", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        excludedCategoryIds: new Set(["cat-1"]),
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("excludeCategory")).toBe("cat-1")
    })

    it("should convert account IDs", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        selectedAccountIds: new Set(["acc-1", "acc-2"]),
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("accountId")).toBe("acc-1,acc-2")
    })

    it("should convert tag IDs", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        selectedTagIds: new Set(["tag-1"]),
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("tagId")).toBe("tag-1")
    })

    it("should convert boolean toggles", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        showIncome: true,
        showExpenses: false,
        showTransfers: true,
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("showIncome")).toBe("true")
      expect(params.get("showExpenses")).toBe("false")
      expect(params.get("showTransfers")).toBe("true")
    })

    it("should convert uncategorized filter", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        showOnlyUncategorized: true,
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("uncategorized")).toBe("true")
    })

    it("should convert search query", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        searchQuery: "coffee shop",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("search")).toBe("coffee shop")
    })

    it("should convert sort parameters", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        sortBy: "amount",
        sortDirection: "asc",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("sortBy")).toBe("amount")
      expect(params.get("sortDirection")).toBe("asc")
    })

    it('should not include default sortBy value "date"', () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        sortBy: "date",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.has("sortBy")).toBe(false)
    })

    it('should not include default sortDirection value "desc"', () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        sortDirection: "desc",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.has("sortDirection")).toBe(false)
    })

    it("should not include empty Sets", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        selectedCategoryIds: new Set(),
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.has("categoryId")).toBe(false)
    })

    it("should handle all filters together", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {
        dateRange: "last30",
        selectedCategoryIds: new Set(["cat-1"]),
        showIncome: false,
        searchQuery: "test",
        sortBy: "amount",
        sortDirection: "asc",
      }

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.get("dateRange")).toBe("last30")
      expect(params.get("categoryId")).toBe("cat-1")
      expect(params.get("showIncome")).toBe("false")
      expect(params.get("search")).toBe("test")
      expect(params.get("sortBy")).toBe("amount")
      expect(params.get("sortDirection")).toBe("asc")
    })

    it("should create empty URLSearchParams for empty filters", () => {
      // Arrange
      const filters: TransactionFiltersFromUrl = {}

      // Act
      const params = transactionFiltersToUrlParams(filters)

      // Assert
      expect(params.toString()).toBe("")
    })
  })

  describe("Round-trip conversion", () => {
    it("should maintain data integrity through parse and convert cycle", () => {
      // Arrange
      const originalFilters: TransactionFiltersFromUrl = {
        dateRange: "last30",
        selectedCategoryIds: new Set(["cat-1", "cat-2"]),
        selectedSubcategoryIds: new Set(["sub-1"]),
        showIncome: true,
        showExpenses: false,
        searchQuery: "test query",
        sortBy: "amount",
        sortDirection: "asc",
      }

      // Act
      const params = transactionFiltersToUrlParams(originalFilters)
      const parsedFilters = parseTransactionFiltersFromUrl(params)

      // Assert
      expect(parsedFilters.dateRange).toBe(originalFilters.dateRange)
      expect(parsedFilters.selectedCategoryIds).toEqual(originalFilters.selectedCategoryIds)
      expect(parsedFilters.selectedSubcategoryIds).toEqual(originalFilters.selectedSubcategoryIds)
      expect(parsedFilters.showIncome).toBe(originalFilters.showIncome)
      expect(parsedFilters.showExpenses).toBe(originalFilters.showExpenses)
      expect(parsedFilters.searchQuery).toBe(originalFilters.searchQuery)
      expect(parsedFilters.sortBy).toBe(originalFilters.sortBy)
      expect(parsedFilters.sortDirection).toBe(originalFilters.sortDirection)
    })
  })
})
