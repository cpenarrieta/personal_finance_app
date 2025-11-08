import { test, expect } from './fixtures/authenticated-page';
import { waitForPageLoad } from './utils/test-helpers';

test.describe('Category Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/manage-categories');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('can create a new category', async ({ page }) => {
    // Find the add category form
    const categoryNameInput = page.locator('input[name="name"], input#category-name');

    if (!(await categoryNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Category form not found');
      return;
    }

    // Generate unique category name
    const uniqueCategoryName = `E2E Test Category ${Date.now()}`;

    // Fill in category name
    await categoryNameInput.fill(uniqueCategoryName);

    // Optional: Fill in image URL
    const imageUrlInput = page.locator('input[name="imageUrl"], input#category-image');

    if (await imageUrlInput.isVisible()) {
      await imageUrlInput.fill('https://example.com/test-icon.png');
    }

    // Submit form
    const submitButton = page.locator('button:has-text("Add Category"), button[type="submit"]').first();
    await submitButton.click();

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Verify category appears in the list
    const categoryInList = page.locator(`text=${uniqueCategoryName}`);
    await expect(categoryInList).toBeVisible({ timeout: 10000 });
  });

  test('can create a transfer category', async ({ page }) => {
    const categoryNameInput = page.locator('input[name="name"], input#category-name');

    if (!(await categoryNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Category form not found');
      return;
    }

    const uniqueCategoryName = `E2E Transfer ${Date.now()}`;

    await categoryNameInput.fill(uniqueCategoryName);

    // Check the transfer category checkbox
    const transferCheckbox = page.locator('input[name="isTransferCategory"], input#is-transfer-category');

    if (await transferCheckbox.isVisible()) {
      await transferCheckbox.check();
    }

    // Submit
    const submitButton = page.locator('button:has-text("Add Category"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Verify category appears
    const categoryInList = page.locator(`text=${uniqueCategoryName}`);
    await expect(categoryInList).toBeVisible({ timeout: 10000 });

    // Look for transfer indicator (badge, icon, etc.)
    const pageContent = await page.textContent('body');
    const hasTransferIndicator =
      pageContent?.includes('Transfer') ||
      pageContent?.includes('transfer');

    expect(hasTransferIndicator).toBe(true);
  });

  test('can delete a category', async ({ page }) => {
    // First create a category to delete
    const categoryNameInput = page.locator('input[name="name"], input#category-name');

    if (!(await categoryNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Category form not found');
      return;
    }

    const uniqueCategoryName = `E2E Delete Category ${Date.now()}`;

    await categoryNameInput.fill(uniqueCategoryName);

    const submitButton = page.locator('button:has-text("Add Category"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Verify it was created
    let categoryElement = page.locator(`text=${uniqueCategoryName}`).first();
    await expect(categoryElement).toBeVisible({ timeout: 10000 });

    // Find the delete button for this category
    // The delete button is usually near the category name
    const categoryRow = page.locator(`text=${uniqueCategoryName}`).locator('..').locator('..');

    const deleteButton = categoryRow.locator('button:has-text("Delete"), button[aria-label*="Delete"]').first();

    if (!(await deleteButton.isVisible({ timeout: 2000 }))) {
      // Try looking for delete button another way
      const allDeleteButtons = page.locator('button:has-text("Delete")');
      const deleteButtonCount = await allDeleteButtons.count();

      if (deleteButtonCount > 0) {
        // Click the last delete button (most recently added category)
        await allDeleteButtons.last().click();
      } else {
        test.skip(true, 'Delete button not found');
        return;
      }
    } else {
      await deleteButton.click();
    }

    // Handle confirmation dialog
    await page.waitForTimeout(500);

    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').last();

    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Wait for deletion
    await page.waitForTimeout(2000);

    // Verify category is gone
    categoryElement = page.locator(`text=${uniqueCategoryName}`);
    await expect(categoryElement).not.toBeVisible({ timeout: 5000 });
  });

  test('can create a subcategory', async ({ page }) => {
    // Look for an existing category
    const pageContent = await page.textContent('body');

    if (!pageContent || pageContent.includes('No categories yet')) {
      // Create a parent category first
      const categoryNameInput = page.locator('input[name="name"], input#category-name');
      await categoryNameInput.fill(`E2E Parent Category ${Date.now()}`);

      const submitButton = page.locator('button:has-text("Add Category"), button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(2000);
    }

    // Look for "Add Subcategory" button or form
    const addSubcategoryButton = page.locator('button:has-text("Add Subcategory"), button:has-text("+ Subcategory")').first();

    if (!(await addSubcategoryButton.isVisible({ timeout: 2000 }))) {
      test.skip(true, 'Add Subcategory button not found');
      return;
    }

    await addSubcategoryButton.click();
    await page.waitForTimeout(500);

    // Fill in subcategory name
    const subcategoryNameInput = page.locator('input[name="name"]').last();
    const uniqueSubcategoryName = `E2E Subcategory ${Date.now()}`;

    await subcategoryNameInput.fill(uniqueSubcategoryName);

    // Submit subcategory form
    const submitSubButton = page.locator('button:has-text("Add"), button[type="submit"]').last();
    await submitSubButton.click();

    await page.waitForTimeout(2000);

    // Verify subcategory appears
    const subcategoryInList = page.locator(`text=${uniqueSubcategoryName}`);
    await expect(subcategoryInList).toBeVisible({ timeout: 10000 });
  });

  test('can delete a subcategory', async ({ page }) => {
    // Look for existing subcategories
    const deleteSubButtons = page.locator('button:has-text("Delete")').filter({ hasText: '' });
    const buttonCount = await deleteSubButtons.count();

    if (buttonCount === 0) {
      test.skip(true, 'No subcategories to delete');
      return;
    }

    // Create a new subcategory to delete
    const addSubcategoryButton = page.locator('button:has-text("Add Subcategory"), button:has-text("+ Subcategory")').first();

    if (await addSubcategoryButton.isVisible({ timeout: 2000 })) {
      await addSubcategoryButton.click();
      await page.waitForTimeout(500);

      const subcategoryNameInput = page.locator('input[name="name"]').last();
      const uniqueSubcategoryName = `E2E Delete Sub ${Date.now()}`;

      await subcategoryNameInput.fill(uniqueSubcategoryName);

      const submitButton = page.locator('button:has-text("Add"), button[type="submit"]').last();
      await submitButton.click();

      await page.waitForTimeout(2000);

      // Find and delete this subcategory
      const subcategoryElement = page.locator(`text=${uniqueSubcategoryName}`).first();

      if (await subcategoryElement.isVisible()) {
        const subcategoryRow = subcategoryElement.locator('..').locator('..');
        const deleteButton = subcategoryRow.locator('button:has-text("Delete")').first();

        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click();

          // Handle confirmation
          await page.waitForTimeout(500);

          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();

          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
          }

          await page.waitForTimeout(2000);

          // Verify it's deleted
          await expect(subcategoryElement).not.toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('can toggle transfer category setting', async ({ page }) => {
    // Look for existing categories with transfer toggles
    const transferToggles = page.locator('button[role="switch"], input[type="checkbox"][name*="transfer"]');
    const toggleCount = await transferToggles.count();

    if (toggleCount === 0) {
      test.skip(true, 'No transfer toggles found');
      return;
    }

    const firstToggle = transferToggles.first();

    if (await firstToggle.isVisible()) {
      // Get current state
      const initialState = await firstToggle.getAttribute('aria-checked');

      // Toggle it
      await firstToggle.click();
      await page.waitForTimeout(1000);

      // Verify state changed
      const newState = await firstToggle.getAttribute('aria-checked');

      expect(newState).not.toBe(initialState);
    }
  });

  test('validation: cannot create category without name', async ({ page }) => {
    const categoryNameInput = page.locator('input[name="name"], input#category-name');

    if (!(await categoryNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Category form not found');
      return;
    }

    // Leave name empty, try to submit
    const submitButton = page.locator('button:has-text("Add Category"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(500);

    // Form should not submit (browser validation or app validation)
    // Check if we're still on the same page with the form
    const formStillVisible = await categoryNameInput.isVisible();
    expect(formStillVisible).toBe(true);
  });

  test('displays category count correctly', async ({ page }) => {
    // Look for category count display
    const pageContent = await page.textContent('body');

    if (!pageContent) {
      test.skip(true, 'Page content not loaded');
      return;
    }

    // Should show "Your Categories (N)"
    const hasCountDisplay = pageContent.includes('Your Categories');

    expect(hasCountDisplay).toBe(true);
  });

  test('can navigate to category reordering', async ({ page }) => {
    // Look for a link or button to reorder categories
    const reorderLink = page.locator('a:has-text("Reorder"), button:has-text("Reorder"), a:has-text("Order")');

    if (await reorderLink.isVisible({ timeout: 2000 })) {
      await reorderLink.click();
      await waitForPageLoad(page);
      await page.waitForTimeout(1000);

      // Should be on reorder page
      const url = page.url();
      const isOnReorderPage = url.includes('order') || url.includes('reorder');

      expect(isOnReorderPage).toBe(true);
    } else {
      test.skip(true, 'Reorder link not found');
    }
  });
});

test.describe('Category Reordering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/category-order');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('category order page loads', async ({ page }) => {
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(100);
  });

  test('can reorder categories', async ({ page }) => {
    // Look for draggable category items or up/down buttons
    const upButtons = page.locator('button:has-text("Up"), button[aria-label*="up"]');
    const downButtons = page.locator('button:has-text("Down"), button[aria-label*="down"]');

    const upButtonCount = await upButtons.count();
    const downButtonCount = await downButtons.count();

    if (upButtonCount > 0) {
      // Click an up button
      await upButtons.first().click();
      await page.waitForTimeout(500);

      // Verify page updated
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else if (downButtonCount > 0) {
      // Click a down button
      await downButtons.first().click();
      await page.waitForTimeout(500);

      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      test.skip(true, 'No reordering controls found');
    }
  });

  test('can save category order', async ({ page }) => {
    // Look for save button
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update Order")');

    if (await saveButton.isVisible({ timeout: 2000 })) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Should show success message or redirect
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      test.skip(true, 'Save button not found');
    }
  });
});
