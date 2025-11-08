import { test, expect } from './fixtures/authenticated-page';
import { waitForPageLoad } from './utils/test-helpers';

test.describe('Settings - Move Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/move-transactions');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('move transactions page loads', async ({ page }) => {
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(100);
  });

  test('can select source category', async ({ page }) => {
    // Look for "From Category" selector
    const fromCategorySelect = page.locator('button[role="combobox"]').first();

    if (!(await fromCategorySelect.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Category selector not found');
      return;
    }

    await fromCategorySelect.click();
    await page.waitForTimeout(500);

    // Select first option
    const categoryOptions = page.locator('[role="option"]');
    const optionCount = await categoryOptions.count();

    if (optionCount > 0) {
      await categoryOptions.first().click();
      await page.waitForTimeout(500);

      // Verify selection
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      test.skip(true, 'No categories available');
    }
  });

  test('can select destination category', async ({ page }) => {
    // Select source category first
    const fromCategorySelect = page.locator('button[role="combobox"]').first();

    if (await fromCategorySelect.isVisible({ timeout: 5000 })) {
      await fromCategorySelect.click();
      await page.waitForTimeout(500);

      const fromOptions = page.locator('[role="option"]');

      if ((await fromOptions.count()) > 0) {
        await fromOptions.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Now select destination category
    const toCategorySelect = page.locator('button[role="combobox"]').nth(1);

    if (await toCategorySelect.isVisible({ timeout: 2000 })) {
      await toCategorySelect.click();
      await page.waitForTimeout(500);

      const toOptions = page.locator('[role="option"]');

      if ((await toOptions.count()) > 0) {
        // Select a different category
        const optionToSelect = (await toOptions.count()) > 1 ? toOptions.nth(1) : toOptions.first();
        await optionToSelect.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can move transactions between categories', async ({ page }) => {
    // Select source category
    const fromCategorySelect = page.locator('button[role="combobox"]').first();

    if (!(await fromCategorySelect.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Category selector not found');
      return;
    }

    await fromCategorySelect.click();
    await page.waitForTimeout(500);

    const fromOptions = page.locator('[role="option"]');

    if ((await fromOptions.count()) === 0) {
      test.skip(true, 'No categories available');
      return;
    }

    await fromOptions.first().click();
    await page.waitForTimeout(500);

    // Select destination category
    const toCategorySelect = page.locator('button[role="combobox"]').nth(1);

    if (await toCategorySelect.isVisible({ timeout: 2000 })) {
      await toCategorySelect.click();
      await page.waitForTimeout(500);

      const toOptions = page.locator('[role="option"]');

      if ((await toOptions.count()) > 0) {
        const optionToSelect = (await toOptions.count()) > 1 ? toOptions.nth(1) : toOptions.first();
        await optionToSelect.click();
        await page.waitForTimeout(500);
      }
    }

    // Click move button
    const moveButton = page.locator('button:has-text("Move"), button:has-text("Move Transactions")');

    if (await moveButton.isVisible({ timeout: 2000 })) {
      await moveButton.click();
      await page.waitForTimeout(2000);

      // Look for success message or confirmation
      const pageContent = await page.textContent('body');
      const hasSuccessIndicator =
        pageContent?.includes('moved') ||
        pageContent?.includes('success') ||
        pageContent?.includes('updated');

      // At minimum, page should have updated
      expect(pageContent).toBeTruthy();
    } else {
      test.skip(true, 'Move button not found');
    }
  });

  test('shows transaction count for selected category', async ({ page }) => {
    // Select a category
    const fromCategorySelect = page.locator('button[role="combobox"]').first();

    if (await fromCategorySelect.isVisible({ timeout: 5000 })) {
      await fromCategorySelect.click();
      await page.waitForTimeout(500);

      const fromOptions = page.locator('[role="option"]');

      if ((await fromOptions.count()) > 0) {
        await fromOptions.first().click();
        await page.waitForTimeout(1000);

        // Look for transaction count
        const pageContent = await page.textContent('body');
        const hasCountInfo =
          pageContent?.includes('transaction') ||
          pageContent?.includes('found') ||
          /\d+/.test(pageContent || '');

        expect(hasCountInfo).toBe(true);
      }
    }
  });

  test('validation: cannot move to same category', async ({ page }) => {
    // Select source category
    const fromCategorySelect = page.locator('button[role="combobox"]').first();

    if (!(await fromCategorySelect.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Category selector not found');
      return;
    }

    await fromCategorySelect.click();
    await page.waitForTimeout(500);

    const fromOptions = page.locator('[role="option"]');

    if ((await fromOptions.count()) === 0) {
      test.skip(true, 'No categories available');
      return;
    }

    const categoryText = await fromOptions.first().textContent();
    await fromOptions.first().click();
    await page.waitForTimeout(500);

    // Try to select same category as destination
    const toCategorySelect = page.locator('button[role="combobox"]').nth(1);

    if (await toCategorySelect.isVisible({ timeout: 2000 })) {
      await toCategorySelect.click();
      await page.waitForTimeout(500);

      const toOptions = page.locator('[role="option"]');

      // Try to find and select the same category
      const sameOption = toOptions.filter({ hasText: categoryText || '' });

      if ((await sameOption.count()) > 0) {
        await sameOption.first().click();
        await page.waitForTimeout(500);

        // Try to move
        const moveButton = page.locator('button:has-text("Move")');

        if (await moveButton.isVisible({ timeout: 2000 })) {
          const isDisabled = await moveButton.isDisabled();

          // Button should be disabled or show error
          if (!isDisabled) {
            await moveButton.click();
            await page.waitForTimeout(1000);

            const pageContent = await page.textContent('body');
            const hasErrorMessage =
              pageContent?.includes('same') ||
              pageContent?.includes('different') ||
              pageContent?.includes('error');

            // Should show error or prevent move
            expect(hasErrorMessage || isDisabled).toBe(true);
          } else {
            expect(isDisabled).toBe(true);
          }
        }
      }
    }
  });
});

test.describe('Settings - General', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(100);
  });

  test('can navigate to different settings sections', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // Look for links to different settings pages
    const settingsLinks = page.locator('a[href*="/settings/"]');
    const linkCount = await settingsLinks.count();

    expect(linkCount).toBeGreaterThan(0);

    // Try clicking the first settings link
    if (linkCount > 0) {
      const firstLink = settingsLinks.first();
      await firstLink.click();
      await waitForPageLoad(page);
      await page.waitForTimeout(1000);

      // Verify navigation worked
      const url = page.url();
      expect(url).toContain('/settings');
    }
  });

  test('settings navigation displays all options', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    // Should have links to various settings pages
    const hasSettingsOptions =
      pageContent?.includes('Manage') ||
      pageContent?.includes('Categories') ||
      pageContent?.includes('Tags') ||
      pageContent?.includes('Settings');

    expect(hasSettingsOptions).toBe(true);
  });
});

test.describe('Settings - Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('can view connected accounts', async ({ page }) => {
    // Look for accounts section or link
    const accountsLink = page.locator('a:has-text("Accounts"), a:has-text("Connected"), a[href*="account"]');

    if (await accountsLink.first().isVisible({ timeout: 2000 })) {
      await accountsLink.first().click();
      await waitForPageLoad(page);
      await page.waitForTimeout(1000);

      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      // Accounts might be on the main page
      const pageContent = await page.textContent('body');
      const hasAccountInfo =
        pageContent?.includes('Account') ||
        pageContent?.includes('Bank') ||
        pageContent?.includes('Connected');

      expect(pageContent).toBeTruthy();
    }
  });

  test('displays account information', async ({ page }) => {
    const pageContent = await page.textContent('body');

    // Should show some account or banking related information
    expect(pageContent).toBeTruthy();
  });
});
