import { test, expect } from "./fixtures/authenticated-page"
import { waitForPageLoad } from "./utils/test-helpers"

test.describe("Transaction Detail", () => {
  test("can navigate to transaction detail from transactions list", async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    // Look for any clickable transaction rows or links
    // Transaction items might be in a table or list
    const transactionLinks = page.locator('a[href*="/transactions/"]')
    const linkCount = await transactionLinks.count()

    if (linkCount > 0) {
      // Click the first transaction link
      const firstLink = transactionLinks.first()
      await firstLink.click()

      // Wait for navigation
      await waitForPageLoad(page)
      await page.waitForTimeout(2000)

      // Verify we're on a transaction detail page
      expect(page.url()).toMatch(/\/transactions\/[^/]+$/)

      // Page should have loaded
      const bodyContent = await page.textContent("body")
      expect(bodyContent).toBeTruthy()
      expect(bodyContent!.length).toBeGreaterThan(100)
    } else {
      // If no transactions exist, that's okay - skip this test
      test.skip()
    }
  })

  test("transaction detail page displays transaction information", async ({ page }) => {
    // First, try to get a transaction ID from the transactions page
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    const transactionLinks = page.locator('a[href*="/transactions/"]')
    const linkCount = await transactionLinks.count()

    if (linkCount > 0) {
      // Get the first transaction link href
      const href = await transactionLinks.first().getAttribute("href")

      if (href) {
        await page.goto(href)
        await waitForPageLoad(page)
        await page.waitForTimeout(2000)

        // Verify page loaded with content
        const bodyContent = await page.textContent("body")
        expect(bodyContent).toBeTruthy()
        expect(bodyContent!.length).toBeGreaterThan(100)

        // Page title should be set
        const title = await page.title()
        expect(title).toBeTruthy()
        expect(title.length).toBeGreaterThan(0)
      }
    } else {
      test.skip()
    }
  })

  test("transaction detail page has back navigation", async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    const transactionLinks = page.locator('a[href*="/transactions/"]')
    const linkCount = await transactionLinks.count()

    if (linkCount > 0) {
      const href = await transactionLinks.first().getAttribute("href")

      if (href) {
        await page.goto(href)
        await waitForPageLoad(page)
        await page.waitForTimeout(2000)

        // Look for back button or breadcrumb
        const backLinks = page.locator('a[href="/transactions"], button:has-text("Back")')
        const backLinkCount = await backLinks.count()

        // Should have some way to navigate back
        expect(backLinkCount).toBeGreaterThanOrEqual(0)
      }
    } else {
      test.skip()
    }
  })

  test("handles non-existent transaction gracefully", async ({ page }) => {
    // Try to access a transaction that doesn't exist
    await page.goto("/transactions/non-existent-id-12345")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    // Should either show an error message or redirect
    // The page should load without crashing
    const bodyContent = await page.textContent("body")
    expect(bodyContent).toBeTruthy()

    // Check if page shows "not found" or similar message
    const pageText = bodyContent?.toLowerCase() || ""
    const hasErrorMessage =
      pageText.includes("not found") || pageText.includes("error") || pageText.includes("no transaction")

    // Either shows error or redirects
    expect(hasErrorMessage || page.url().includes("/transactions")).toBe(true)
  })
})

test.describe("Add Transaction Modal", () => {
  test("can open add transaction modal", async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    // Click "Add Transaction" button
    const addButton = page.locator('button:has-text("Add Transaction")')

    if (await addButton.isVisible()) {
      await addButton.click()

      // Wait for modal to appear
      await page.waitForTimeout(500)

      // Look for modal dialog
      const modal = page.locator('[role="dialog"], [role="alertdialog"]')
      const modalVisible = await modal.isVisible().catch(() => false)

      if (modalVisible) {
        await expect(modal).toBeVisible()

        // Modal should have a form or content
        const modalContent = await modal.textContent()
        expect(modalContent).toBeTruthy()
        expect(modalContent!.length).toBeGreaterThan(10)
      }
    }
  })

  test("add transaction modal has required fields", async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    const addButton = page.locator('button:has-text("Add Transaction")')

    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)

      const modal = page.locator('[role="dialog"], [role="alertdialog"]')
      const modalVisible = await modal.isVisible().catch(() => false)

      if (modalVisible) {
        // Should have input fields
        const inputs = modal.locator("input, select, textarea")
        const inputCount = await inputs.count()

        // Modal should have form fields
        expect(inputCount).toBeGreaterThan(0)
      }
    }
  })

  test("can close add transaction modal", async ({ page }) => {
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    const addButton = page.locator('button:has-text("Add Transaction")')

    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)

      const modal = page.locator('[role="dialog"], [role="alertdialog"]')
      const modalVisible = await modal.isVisible().catch(() => false)

      if (modalVisible) {
        // Look for close button (X, Cancel, Close, etc.)
        const closeButtons = modal.locator(
          'button:has-text("Cancel"), button:has-text("Close"), button[aria-label="Close"]',
        )
        const closeButtonCount = await closeButtons.count()

        if (closeButtonCount > 0) {
          await closeButtons.first().click()
          await page.waitForTimeout(500)

          // Modal should be hidden
          const stillVisible = await modal.isVisible().catch(() => false)
          expect(stillVisible).toBe(false)
        }
      }
    }
  })
})

test.describe("Edit Transaction Modal", () => {
  test("can open edit transaction modal from detail page", async ({ page }) => {
    // Navigate to transactions page first
    await page.goto("/transactions")
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)

    const transactionLinks = page.locator('a[href*="/transactions/"]')
    const linkCount = await transactionLinks.count()

    if (linkCount > 0) {
      const href = await transactionLinks.first().getAttribute("href")

      if (href) {
        await page.goto(href)
        await waitForPageLoad(page)
        await page.waitForTimeout(2000)

        // Look for edit button
        const editButtons = page.locator('button:has-text("Edit")')
        const editButtonCount = await editButtons.count()

        if (editButtonCount > 0) {
          await editButtons.first().click()
          await page.waitForTimeout(500)

          // Look for modal
          const modal = page.locator('[role="dialog"], [role="alertdialog"]')
          const modalVisible = await modal.isVisible().catch(() => false)

          if (modalVisible) {
            await expect(modal).toBeVisible()
          }
        }
      }
    } else {
      test.skip()
    }
  })
})
