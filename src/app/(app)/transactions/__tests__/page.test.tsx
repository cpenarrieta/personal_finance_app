/**
 * Unit tests for Transactions Page
 *
 * Note: This page uses Convex for data fetching via a client component.
 * These tests verify basic module structure. For comprehensive testing,
 * use E2E tests with Playwright.
 */

// Mock the TransactionsPageConvex component (uses Convex internally)
jest.mock("@/components/transactions/list/TransactionsPageConvex", () => ({
  TransactionsPageConvex: jest.fn(() => <div data-testid="transactions-page">Transactions Page</div>),
}))

describe("TransactionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
 * The above tests are intentionally simple because the transactions page uses
 * Convex for data fetching via client components. For comprehensive testing of:
 * - Data fetching behavior
 * - User interactions
 * - UI rendering
 * - Filter functionality
 *
 * Please use E2E tests with tools like Playwright that run in an actual browser
 * environment where Convex and React work as intended.
 */
