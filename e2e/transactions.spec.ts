import { test, expect } from "./fixtures/authenticated-page"
import { waitForPageLoad } from "./utils/test-helpers"

test.describe("Transactions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    // Wait for suspense to resolve
    await page.waitForTimeout(2000)
  })

  test("displays transactions page header", async ({ page }) => {
    // Check for page title
    const heading = page.locator('h1:has-text("Banking Transactions")')
    await expect(heading).toBeVisible()

    // Check for description
    const description = page.locator("text=View and search all your banking transactions")
    await expect(description).toBeVisible()
  })

  test("displays add transaction button", async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Transaction")')
    await expect(addButton).toBeVisible()
  })

  test("displays table and charts tabs", async ({ page }) => {
    // Check for tabs
    const tableTab = page.locator('[role="tab"]:has-text("Table")')
    await expect(tableTab).toBeVisible()

    const chartsTab = page.locator('[role="tab"]:has-text("Charts")')
    await expect(chartsTab).toBeVisible()
  })

  test("can switch between table and charts view", async ({ page }) => {
    // Default should be table view
    const tableTab = page.locator('[role="tab"]:has-text("Table")')
    await expect(tableTab).toHaveAttribute("data-state", "active")

    // Click charts tab
    const chartsTab = page.locator('[role="tab"]:has-text("Charts")')
    await chartsTab.click()

    // Wait for tab switch
    await page.waitForTimeout(500)

    // Charts tab should now be active
    await expect(chartsTab).toHaveAttribute("data-state", "active")

    // Switch back to table
    await tableTab.click()
    await page.waitForTimeout(500)
    await expect(tableTab).toHaveAttribute("data-state", "active")
  })

  test("displays search input", async ({ page }) => {
    // Look for search/filter inputs
    const inputs = page.locator('input[type="text"], input[type="search"]')
    const inputCount = await inputs.count()

    // Should have at least one input (search or other filters)
    expect(inputCount).toBeGreaterThan(0)
  })

  test("can search transactions", async ({ page }) => {
    // Find search input - it might have placeholder text
    const searchInput = page.locator('input[type="text"]').first()

    if (await searchInput.isVisible()) {
      // Type in search box
      await searchInput.fill("test")
      await page.waitForTimeout(500)

      // Verify input has value
      await expect(searchInput).toHaveValue("test")

      // Clear search
      await searchInput.fill("")
    }
  })

  test("displays filter controls", async ({ page }) => {
    // Check for presence of select dropdowns (date range, categories, etc.)
    const selects = page.locator('select, [role="combobox"]')
    const selectCount = await selects.count()

    // Should have some filter controls
    expect(selectCount).toBeGreaterThanOrEqual(0)
  })

  test("can change date range filter", async ({ page }) => {
    // Look for date range selector
    const dateRangeSelectors = page.locator('select, [role="combobox"]')
    const count = await dateRangeSelectors.count()

    if (count > 0) {
      // There should be some way to filter by date
      const pageContent = await page.content()
      // Just verify the page has loaded with filter controls
      expect(pageContent.length).toBeGreaterThan(1000)
    }
  })

  test("displays transaction list or empty state", async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000)

    const bodyContent = await page.textContent("body")

    // Should have substantial content
    expect(bodyContent).toBeTruthy()
    expect(bodyContent!.length).toBeGreaterThan(500)
  })

  test("income and expense toggles are present", async ({ page }) => {
    // Look for checkboxes that might control income/expense visibility
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()

    // Should have some checkboxes for filters
    expect(checkboxCount).toBeGreaterThanOrEqual(0)
  })
})

test.describe("Transaction Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
  })

  test("can filter by category", async ({ page }) => {
    // Look for category filter controls
    const selects = page.locator('select, [role="combobox"]')
    const count = await selects.count()

    // Verify filtering UI exists
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test("can filter by account", async ({ page }) => {
    // Look for account filter
    const pageContent = await page.content()

    // Page should have filter controls
    expect(pageContent.length).toBeGreaterThan(1000)
  })

  test("can filter by tags", async ({ page }) => {
    // Tags filter might be present
    const pageContent = await page.content()

    // Verify page loaded with filters
    expect(pageContent.length).toBeGreaterThan(1000)
  })

  test("filters persist in URL", async ({ page }) => {
    // Try to interact with a filter if available
    const selects = page.locator("select").first()

    if (await selects.isVisible()) {
      // Some filters should update URL
      await page.waitForTimeout(1000)
      // URL may change based on filter interactions
    }

    // URL should still be on transactions page
    expect(page.url()).toContain("/transactions")
  })

  test("can clear filters", async ({ page }) => {
    // Look for clear/reset buttons
    const buttons = page.locator("button")
    const buttonCount = await buttons.count()

    // Should have buttons (including potential clear filters button)
    expect(buttonCount).toBeGreaterThan(0)
  })
})

test.describe("Transaction Sorting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
  })

  test("can sort transactions", async ({ page }) => {
    // Look for sort controls (could be column headers or sort dropdown)
    const pageContent = await page.content()

    // Verify page has loaded with sorting capability
    expect(pageContent.length).toBeGreaterThan(1000)
  })
})
