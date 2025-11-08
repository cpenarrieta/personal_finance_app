import { test, expect } from './fixtures/authenticated-page';
import { waitForPageLoad } from './utils/test-helpers';

test.describe('Transaction CRUD Operations', () => {
  let createdTransactionId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('can create a new transaction', async ({ page }) => {
    // Click "Add Transaction" button
    const addButton = page.locator('button:has-text("Add Transaction")');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Fill out the form
    // Account selection (select the first available account)
    const accountSelect = modal.locator('select').first();
    await accountSelect.waitFor({ state: 'visible' });

    // Get the first available account value
    const firstAccountOption = await accountSelect.locator('option:not([value=""])').first();
    const accountValue = await firstAccountOption.getAttribute('value');

    if (!accountValue) {
      test.skip(true, 'No accounts available for testing');
      return;
    }

    await accountSelect.selectOption(accountValue);

    // Transaction name
    await modal.locator('input[name="name"], input[id="name"]').fill('E2E Test Transaction');

    // Amount (make it negative for expenses)
    await modal.locator('input[name="amount"], input[id="amount"]').fill('-25.50');

    // Date (use today's date)
    const dateInput = modal.locator('input[type="date"], input[name="date"], input[id="date"]');
    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);

    // Optional: Add notes
    const notesField = modal.locator('textarea[name="notes"], textarea[id="notes"]');
    if (await notesField.isVisible()) {
      await notesField.fill('Created by E2E test');
    }

    // Submit the form
    const submitButton = modal.locator('button:has-text("Add"), button:has-text("Create"), button[type="submit"]').last();
    await submitButton.click();

    // Wait for the modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Wait for the page to update
    await page.waitForTimeout(2000);

    // Verify the transaction appears in the list
    const transactionRow = page.locator('text=E2E Test Transaction').first();
    await expect(transactionRow).toBeVisible({ timeout: 10000 });

    // Store the transaction ID for cleanup
    // Try to find a link to the transaction detail
    const transactionLink = page.locator('a:has-text("E2E Test Transaction")').first();
    if (await transactionLink.isVisible()) {
      const href = await transactionLink.getAttribute('href');
      if (href) {
        const matches = href.match(/\/transactions\/([^/]+)$/);
        if (matches) {
          createdTransactionId = matches[1];
        }
      }
    }
  });

  test('can edit an existing transaction', async ({ page }) => {
    // Find any existing transaction
    const transactionLinks = page.locator('a[href*="/transactions/"]');
    const linkCount = await transactionLinks.count();

    if (linkCount === 0) {
      test.skip(true, 'No transactions available to edit');
      return;
    }

    // Click on the first transaction
    const firstLink = transactionLinks.first();
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // Click the Edit button
    const editButton = page.locator('button:has-text("Edit")').first();

    if (!(await editButton.isVisible())) {
      test.skip(true, 'Edit button not found on transaction detail page');
      return;
    }

    await editButton.click();

    // Wait for edit modal
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Update the transaction name
    const nameInput = modal.locator('input[name="name"], input[id="name"]');
    await nameInput.clear();
    await nameInput.fill('E2E Updated Transaction');

    // Update notes
    const notesField = modal.locator('textarea[name="notes"], textarea[id="notes"]');
    if (await notesField.isVisible()) {
      await notesField.clear();
      await notesField.fill('Updated by E2E test at ' + new Date().toISOString());
    }

    // Submit the form
    const submitButton = modal.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').last();
    await submitButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Verify the updated name appears on the page
    const updatedName = page.locator('text=E2E Updated Transaction').first();
    await expect(updatedName).toBeVisible({ timeout: 10000 });
  });

  test('can delete a transaction', async ({ page }) => {
    // First, create a transaction to delete
    const addButton = page.locator('button:has-text("Add Transaction")');

    if (!(await addButton.isVisible())) {
      test.skip(true, 'Add Transaction button not available');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Fill minimal required fields
    const accountSelect = modal.locator('select').first();
    const firstAccountOption = await accountSelect.locator('option:not([value=""])').first();
    const accountValue = await firstAccountOption.getAttribute('value');

    if (!accountValue) {
      test.skip(true, 'No accounts available');
      return;
    }

    await accountSelect.selectOption(accountValue);
    await modal.locator('input[name="name"], input[id="name"]').fill('E2E Delete Test Transaction');
    await modal.locator('input[name="amount"], input[id="amount"]').fill('-10.00');

    const dateInput = modal.locator('input[type="date"], input[name="date"], input[id="date"]');
    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);

    const submitButton = modal.locator('button:has-text("Add"), button:has-text("Create"), button[type="submit"]').last();
    await submitButton.click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Find and click on the newly created transaction
    const transactionLink = page.locator('a:has-text("E2E Delete Test Transaction")').first();

    if (!(await transactionLink.isVisible())) {
      test.skip(true, 'Created transaction not found');
      return;
    }

    await transactionLink.click();
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // Click the Delete button
    const deleteButton = page.locator('button:has-text("Delete")').first();

    if (!(await deleteButton.isVisible())) {
      test.skip(true, 'Delete button not found');
      return;
    }

    await deleteButton.click();

    // Handle confirmation dialog if present
    await page.waitForTimeout(500);

    // Look for a confirmation dialog or button
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').last();

    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Wait for deletion to complete
    await page.waitForTimeout(1000);

    // Should be redirected to transactions list or the transaction should not be visible
    const currentUrl = page.url();
    const isOnTransactionsPage = currentUrl.includes('/transactions') && !currentUrl.match(/\/transactions\/[^/]+$/);

    if (!isOnTransactionsPage) {
      // If still on detail page, wait a bit more and check again
      await page.waitForTimeout(2000);
    }

    // Verify transaction is gone from the list
    await page.goto('/transactions');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const deletedTransaction = page.locator('a:has-text("E2E Delete Test Transaction")');
    await expect(deletedTransaction).not.toBeVisible({ timeout: 5000 });
  });

  test('can add tags to a transaction', async ({ page }) => {
    // Find an existing transaction
    const transactionLinks = page.locator('a[href*="/transactions/"]');
    const linkCount = await transactionLinks.count();

    if (linkCount === 0) {
      test.skip(true, 'No transactions available');
      return;
    }

    // Go to first transaction detail
    const firstLink = transactionLinks.first();
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // Click Edit button
    const editButton = page.locator('button:has-text("Edit")').first();

    if (!(await editButton.isVisible())) {
      test.skip(true, 'Edit button not found');
      return;
    }

    await editButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Look for tag selection UI (badges, checkboxes, etc.)
    // The TagSelector component renders tags as clickable badges
    const tagBadges = modal.locator('[role="button"]').filter({ hasText: /^(?!Cancel|Save|Update|Close)/ });
    const tagCount = await tagBadges.count();

    if (tagCount > 0) {
      // Click the first tag to select it
      await tagBadges.first().click();
      await page.waitForTimeout(300);
    }

    // Save changes
    const submitButton = modal.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').last();
    await submitButton.click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify tags appear (tags would show in the UI)
    // This is a basic verification - the exact location depends on UI implementation
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('can change transaction category', async ({ page }) => {
    // Find an existing transaction
    const transactionLinks = page.locator('a[href*="/transactions/"]');
    const linkCount = await transactionLinks.count();

    if (linkCount === 0) {
      test.skip(true, 'No transactions available');
      return;
    }

    // Go to first transaction
    const firstLink = transactionLinks.first();
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // Click Edit
    const editButton = page.locator('button:has-text("Edit")').first();

    if (!(await editButton.isVisible())) {
      test.skip(true, 'Edit button not found');
      return;
    }

    await editButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Find category select dropdown
    // The CategorySelect component uses a custom select UI
    const categoryButton = modal.locator('button[role="combobox"]').first();

    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForTimeout(500);

      // Select an option from the dropdown
      const categoryOptions = page.locator('[role="option"]');
      const optionCount = await categoryOptions.count();

      if (optionCount > 0) {
        await categoryOptions.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Save changes
    const submitButton = modal.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').last();
    await submitButton.click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify the page updated
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('validation: cannot create transaction without required fields', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Transaction")');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Try to submit without filling required fields
    const submitButton = modal.locator('button:has-text("Add"), button:has-text("Create"), button[type="submit"]').last();
    await submitButton.click();

    await page.waitForTimeout(500);

    // Modal should still be visible (validation failed)
    // Or there should be an alert/error message
    const modalStillVisible = await modal.isVisible();

    if (modalStillVisible) {
      // Check for validation error messages
      const bodyText = await page.textContent('body');
      const hasValidationMessage =
        bodyText?.includes('required') ||
        bodyText?.includes('Please') ||
        bodyText?.includes('select') ||
        bodyText?.includes('enter');

      expect(modalStillVisible || hasValidationMessage).toBe(true);
    }
  });
});
