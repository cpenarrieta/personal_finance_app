import { test, expect } from "./fixtures/authenticated-page"

test("dashboard loads", async ({ page }) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  const body = page.locator("body")
  await expect(body).toBeVisible()
  expect((await page.content()).length).toBeGreaterThan(1000)
})
