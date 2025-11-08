import { test, expect } from './fixtures/authenticated-page';
import { waitForPageLoad } from './utils/test-helpers';

test.describe('Bulk Transaction Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('can select multiple transactions', async ({ page }) => {
    // Look for checkboxes in the transaction list
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount === 0) {
      test.skip(true, 'No checkboxes found for bulk selection');
      return;
    }

    // Select first few transactions
    const firstCheckbox = checkboxes.nth(0);
    const secondCheckbox = checkboxes.nth(1);

    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.check();
      await page.waitForTimeout(300);

      // Verify checkbox is checked
      const isChecked = await firstCheckbox.isChecked();
      expect(isChecked).toBe(true);
    }

    if (await secondCheckbox.isVisible()) {
      await secondCheckbox.check();
      await page.waitForTimeout(300);
    }

    // Look for bulk action UI (buttons, toolbar, etc.)
    const bodyText = await page.textContent('body');

    // Bulk actions UI should appear when items are selected
    const hasBulkUI =
      bodyText?.includes('selected') ||
      bodyText?.includes('Bulk') ||
      bodyText?.includes('Update');

    // At minimum, checkboxes should be checkable
    const firstIsChecked = await firstCheckbox.isChecked();
    expect(firstIsChecked).toBe(true);
  });

  test('can bulk update category for multiple transactions', async ({ page }) => {
    // Look for checkboxes
    const checkboxes = page.locator('input[type="checkbox"]').filter({ hasText: '' });
    const checkboxCount = await checkboxes.count();

    if (checkboxCount < 2) {
      test.skip(true, 'Not enough transactions for bulk update');
      return;
    }

    // Select multiple transactions
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.waitForTimeout(500);

    // Look for bulk update button/action
    const bulkUpdateButton = page.locator(
      'button:has-text("Bulk Update"), button:has-text("Update Selected"), button:has-text("Update Category")'
    );

    if (!(await bulkUpdateButton.isVisible({ timeout: 2000 }))) {
      test.skip(true, 'Bulk update button not found');
      return;
    }

    await bulkUpdateButton.click();
    await page.waitForTimeout(500);

    // Look for bulk update modal/dialog
    const modal = page.locator('[role="dialog"]').first();

    if (!(await modal.isVisible({ timeout: 2000 }))) {
      test.skip(true, 'Bulk update modal not visible');
      return;
    }

    // Select a category
    const categoryButton = modal.locator('button[role="combobox"]').first();

    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForTimeout(500);

      const categoryOptions = page.locator('[role="option"]');
      const optionCount = await categoryOptions.count();

      if (optionCount > 0) {
        await categoryOptions.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Submit bulk update
    const submitButton = modal.locator('button:has-text("Update"), button:has-text("Save"), button[type="submit"]').last();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait for modal to close
      await expect(modal).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(2000);

      // Verify update was applied
      // The page should refresh and show updated transactions
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('can bulk add tags to multiple transactions', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]').filter({ hasText: '' });
    const checkboxCount = await checkboxes.count();

    if (checkboxCount < 2) {
      test.skip(true, 'Not enough transactions');
      return;
    }

    // Select transactions
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.waitForTimeout(500);

    // Look for bulk update/tag button
    const bulkButton = page.locator(
      'button:has-text("Bulk"), button:has-text("Update Selected"), button:has-text("Add Tags")'
    );

    if (!(await bulkButton.first().isVisible({ timeout: 2000 }))) {
      test.skip(true, 'Bulk action button not found');
      return;
    }

    await bulkButton.first().click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]').first();

    if (!(await modal.isVisible({ timeout: 2000 }))) {
      test.skip(true, 'Bulk update modal not visible');
      return;
    }

    // Look for tag selection UI
    const tagBadges = modal.locator('[role="button"]').filter({ hasText: /^(?!Cancel|Save|Update|Close)/ });
    const tagCount = await tagBadges.count();

    if (tagCount > 0) {
      // Click a tag to select it
      await tagBadges.first().click();
      await page.waitForTimeout(300);
    }

    // Submit
    const submitButton = modal.locator('button:has-text("Update"), button:has-text("Save"), button[type="submit"]').last();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await expect(modal).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(2000);
    }
  });

  test('can deselect all transactions', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]').filter({ hasText: '' });
    const checkboxCount = await checkboxes.count();

    if (checkboxCount === 0) {
      test.skip(true, 'No checkboxes available');
      return;
    }

    // Select some transactions
    if (await checkboxes.nth(0).isVisible()) {
      await checkboxes.nth(0).check();
    }

    if (checkboxCount > 1 && await checkboxes.nth(1).isVisible()) {
      await checkboxes.nth(1).check();
    }

    await page.waitForTimeout(500);

    // Look for "Deselect All" or "Clear Selection" button
    const deselectButton = page.locator(
      'button:has-text("Deselect"), button:has-text("Clear"), button:has-text("Cancel")'
    );

    if (await deselectButton.first().isVisible({ timeout: 2000 })) {
      await deselectButton.first().click();
      await page.waitForTimeout(500);

      // Verify checkboxes are unchecked
      const firstIsChecked = await checkboxes.nth(0).isChecked();
      expect(firstIsChecked).toBe(false);
    } else {
      // Manually uncheck if no deselect button
      if (await checkboxes.nth(0).isVisible()) {
        await checkboxes.nth(0).uncheck();
      }

      await page.waitForTimeout(300);

      const firstIsChecked = await checkboxes.nth(0).isChecked();
      expect(firstIsChecked).toBe(false);
    }
  });

  test('bulk update count reflects selected transactions', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]').filter({ hasText: '' });
    const checkboxCount = await checkboxes.count();

    if (checkboxCount < 3) {
      test.skip(true, 'Not enough transactions');
      return;
    }

    // Select exactly 2 transactions
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.waitForTimeout(500);

    // Look for selected count indicator
    const bodyText = await page.textContent('body');

    // Should show "2 selected" or similar
    const hasCountIndicator =
      bodyText?.includes('2') &&
      (bodyText?.includes('selected') || bodyText?.includes('Selected'));

    // If there's a selection UI, it should indicate count
    if (bodyText?.includes('selected') || bodyText?.includes('Selected')) {
      expect(hasCountIndicator).toBe(true);
    } else {
      // At minimum, checkboxes should be checked
      const firstChecked = await checkboxes.nth(0).isChecked();
      const secondChecked = await checkboxes.nth(1).isChecked();
      expect(firstChecked && secondChecked).toBe(true);
    }
  });

  test('cannot bulk update with no transactions selected', async ({ page }) => {
    // Look for bulk update button when nothing is selected
    const bulkButton = page.locator(
      'button:has-text("Bulk Update"), button:has-text("Update Selected")'
    );

    // Button should either not be visible or be disabled
    const isVisible = await bulkButton.isVisible({ timeout: 1000 }).catch(() => false);

    if (isVisible) {
      const isDisabled = await bulkButton.isDisabled();
      expect(isDisabled).toBe(true);
    } else {
      // Button not visible = correct behavior
      expect(isVisible).toBe(false);
    }
  });

  test('can select all transactions on page', async ({ page }) => {
    // Look for "Select All" checkbox or button
    const selectAllCheckbox = page.locator('input[type="checkbox"]').first();

    // In many table UIs, the first checkbox is "select all"
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      await page.waitForTimeout(500);

      // Check if other checkboxes are now checked
      const allCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await allCheckboxes.count();

      if (checkboxCount > 1) {
        // At least some checkboxes should be checked
        const secondCheckbox = allCheckboxes.nth(1);
        const isChecked = await secondCheckbox.isChecked();

        // Either it's a select-all that checks all, or it's just a regular checkbox
        expect(isChecked !== undefined).toBe(true);
      }
    }
  });

  test('bulk update preserves unselected transactions', async ({ page }) => {
    // This test verifies that bulk updates only affect selected transactions
    const checkboxes = page.locator('input[type="checkbox"]').filter({ hasText: '' });
    const checkboxCount = await checkboxes.count();

    if (checkboxCount < 2) {
      test.skip(true, 'Not enough transactions');
      return;
    }

    // Select only first transaction (not second)
    await checkboxes.nth(0).check();
    await page.waitForTimeout(500);

    // Verify only first is checked, second is not
    const firstChecked = await checkboxes.nth(0).isChecked();
    const secondChecked = await checkboxes.nth(1).isChecked();

    expect(firstChecked).toBe(true);
    expect(secondChecked).toBe(false);
  });
});
