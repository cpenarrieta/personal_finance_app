import { test, expect } from "./fixtures/authenticated-page"
import { verifyMetadata, waitForPageLoad, collectConsoleErrors } from "./utils/test-helpers"

test.describe("Pages Load Without Errors", () => {
  test("Dashboard page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify basic page structure
    await expect(page.locator("body")).toBeVisible()

    // Verify metadata
    await verifyMetadata(page, "Dashboard")
  })

  test("Transactions page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/transactions")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible()

    // Verify metadata
    await verifyMetadata(page, "Transactions")
  })

  test("Accounts page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/accounts")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible()

    // Verify metadata
    await verifyMetadata(page, "Accounts")
  })

  test("Investment Holdings page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/investments/holdings")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible()

    // Verify metadata
    await verifyMetadata(page, "Holdings")
  })

  test("Investment Transactions page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/investments/transactions")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible()

    // Verify metadata
    await verifyMetadata(page, "Investment Transactions")
  })

  test("Settings - Manage Categories page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/settings/manage-categories")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible()

    // Verify metadata
    await verifyMetadata(page, "Manage Categories")
  })

  test("Settings - Manage Tags page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/settings/manage-tags")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible()

    // Verify metadata
    await verifyMetadata(page, "Manage Tags")
  })

  test("Connect Account page loads successfully", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/connect-account")
    await waitForPageLoad(page)

    // Verify no console errors
    expect(errors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0)

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible()
  })
})

test.describe("SEO Metadata", () => {
  test("All pages have proper meta tags", async ({ page }) => {
    const pages = [
      { url: "/", title: "Dashboard" },
      { url: "/transactions", title: "Transactions" },
      { url: "/accounts", title: "Accounts" },
      { url: "/investments/holdings", title: "Holdings" },
    ]

    for (const { url, title } of pages) {
      await page.goto(url)
      await waitForPageLoad(page)

      // Verify title
      await expect(page).toHaveTitle(new RegExp(title, "i"))

      // Verify viewport meta tag
      const viewport = page.locator('meta[name="viewport"]')
      await expect(viewport).toHaveCount(1)
    }
  })
})
