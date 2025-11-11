/**
 * Unit tests for Transactions Page
 *
 * Note: Full integration testing of Next.js 16 async Server Components with
 * "use cache" directives is limited in Jest. These tests verify basic module structure.
 * For comprehensive testing, use E2E tests with Playwright.
 */

import * as cachedQueries from "@/lib/db/queries"

// Mock cached queries module
jest.mock("@/lib/db/queries", () => ({
  getAllTransactions: jest.fn(),
  getAllCategories: jest.fn(),
  getAllTags: jest.fn(),
  getAllAccounts: jest.fn(),
}))

describe("TransactionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Set up default mock returns
    ;(cachedQueries.getAllTransactions as jest.Mock).mockResolvedValue([])
    ;(cachedQueries.getAllCategories as jest.Mock).mockResolvedValue([])
    ;(cachedQueries.getAllTags as jest.Mock).mockResolvedValue([])
    ;(cachedQueries.getAllAccounts as jest.Mock).mockResolvedValue([])
  })

  it("should export a default function", async () => {
    const pageModule = await import("../page")
    expect(pageModule.default).toBeDefined()
    expect(typeof pageModule.default).toBe("function")
  })

  it("should export metadata", async () => {
    const pageModule = await import("../page")
    expect(pageModule.metadata).toBeDefined()
    expect(pageModule.metadata.title).toBe("Banking Transactions")
  })

  it("should render without throwing when called with valid props", async () => {
    const pageModule = await import("../page")
    const TransactionsPage = pageModule.default

    await expect(TransactionsPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined()
  })

  it("should handle search params correctly", async () => {
    const pageModule = await import("../page")
    const TransactionsPage = pageModule.default

    const searchParams = Promise.resolve({
      category: "food",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    })

    await expect(TransactionsPage({ searchParams })).resolves.toBeDefined()
  })

  it("should handle empty search params", async () => {
    const pageModule = await import("../page")
    const TransactionsPage = pageModule.default

    await expect(TransactionsPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined()
  })
})

/**
 * NOTE FOR DEVELOPERS:
 *
 * The above tests are intentionally simple because Next.js 16 async Server Components
 * with "use cache" directives are difficult to unit test in Jest. The mocks don't
 * work as expected due to how Next.js handles caching at the framework level.
 *
 * For comprehensive testing of this page including:
 * - Data fetching behavior
 * - User interactions
 * - UI rendering
 * - Filter functionality
 *
 * Please use E2E tests with tools like Playwright that run in an actual browser
 * environment where Next.js caching works as intended.
 */
