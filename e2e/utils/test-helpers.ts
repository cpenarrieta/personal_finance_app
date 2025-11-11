import { Page, expect } from "@playwright/test"

/**
 * Verify SEO metadata is present on a page
 */
export async function verifyMetadata(page: Page, expectedTitle: string, expectedDescription?: string) {
  // Check page title
  await expect(page).toHaveTitle(new RegExp(expectedTitle, "i"))

  // Check meta description if provided
  if (expectedDescription) {
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute("content", new RegExp(expectedDescription, "i"))
  }

  // Check Open Graph tags
  const ogTitle = page.locator('meta[property="og:title"]')
  await expect(ogTitle).toHaveCount(1)

  const ogDescription = page.locator('meta[property="og:description"]')
  await expect(ogDescription).toHaveCount(1)
}

/**
 * Wait for page to be fully loaded without any console errors
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle")
  await page.waitForLoadState("domcontentloaded")
}

/**
 * Check for any console errors on the page
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text())
    }
  })

  page.on("pageerror", (error) => {
    errors.push(error.message)
  })

  return errors
}

/**
 * Check if an element is visible and contains text
 */
export async function verifyElementVisible(page: Page, selector: string, text?: string) {
  const element = page.locator(selector)
  await expect(element).toBeVisible()

  if (text) {
    await expect(element).toContainText(text)
  }
}
