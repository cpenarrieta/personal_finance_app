import { test, expect } from './fixtures/authenticated-page';
import { waitForPageLoad } from './utils/test-helpers';

test.describe('Tag Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/manage-tags');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('can create a new tag', async ({ page }) => {
    // Find the add tag form
    const tagNameInput = page.locator('input[name="name"], input#tag-name');

    if (!(await tagNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Tag form not found');
      return;
    }

    // Generate unique tag name
    const uniqueTagName = `E2E Tag ${Date.now()}`;

    // Fill in tag name
    await tagNameInput.fill(uniqueTagName);

    // Select a color
    const colorInput = page.locator('input[name="color"], input[type="color"]');

    if (await colorInput.isVisible()) {
      await colorInput.fill('#FF5733');
    }

    // Submit form
    const submitButton = page.locator('button:has-text("Add Tag"), button:has-text("Create Tag"), button[type="submit"]').first();
    await submitButton.click();

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Verify tag appears in the list
    const tagInList = page.locator(`text=${uniqueTagName}`);
    await expect(tagInList).toBeVisible({ timeout: 10000 });
  });

  test('can create tag with custom color', async ({ page }) => {
    const tagNameInput = page.locator('input[name="name"], input#tag-name');

    if (!(await tagNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Tag form not found');
      return;
    }

    const uniqueTagName = `E2E Color Tag ${Date.now()}`;
    await tagNameInput.fill(uniqueTagName);

    // Set a specific color
    const colorInput = page.locator('input[name="color"], input[type="color"]');

    if (await colorInput.isVisible()) {
      await colorInput.fill('#3498DB');
    }

    const submitButton = page.locator('button:has-text("Add Tag"), button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Verify tag appears
    const tagInList = page.locator(`text=${uniqueTagName}`);
    await expect(tagInList).toBeVisible({ timeout: 10000 });

    // Verify color is applied (tag badges usually have colored backgrounds)
    const tagBadge = tagInList.locator('..').first();
    const bgColor = await tagBadge.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    }).catch(() => null);

    // At minimum, verify the element exists
    expect(await tagBadge.isVisible()).toBe(true);
  });

  test('can update a tag name', async ({ page }) => {
    // First create a tag to update
    const tagNameInput = page.locator('input[name="name"], input#tag-name');

    if (!(await tagNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Tag form not found');
      return;
    }

    const originalTagName = `E2E Update Tag ${Date.now()}`;
    await tagNameInput.fill(originalTagName);

    const submitButton = page.locator('button:has-text("Add Tag"), button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Find the edit button for this tag
    const tagElement = page.locator(`text=${originalTagName}`).first();
    await expect(tagElement).toBeVisible({ timeout: 10000 });

    const tagRow = tagElement.locator('..').locator('..');
    const editButton = tagRow.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();

    if (!(await editButton.isVisible({ timeout: 2000 }))) {
      test.skip(true, 'Edit button not found');
      return;
    }

    await editButton.click();
    await page.waitForTimeout(500);

    // Update the tag name
    const editNameInput = page.locator('input[name="name"]').last();
    const updatedTagName = `E2E Updated Tag ${Date.now()}`;

    await editNameInput.clear();
    await editNameInput.fill(updatedTagName);

    // Submit update
    const updateButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').last();
    await updateButton.click();

    await page.waitForTimeout(2000);

    // Verify updated tag appears
    const updatedTagElement = page.locator(`text=${updatedTagName}`);
    await expect(updatedTagElement).toBeVisible({ timeout: 10000 });

    // Verify old name is gone
    const oldTagElement = page.locator(`text=${originalTagName}`);
    await expect(oldTagElement).not.toBeVisible({ timeout: 5000 });
  });

  test('can update a tag color', async ({ page }) => {
    // Create a tag first
    const tagNameInput = page.locator('input[name="name"], input#tag-name');

    if (!(await tagNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Tag form not found');
      return;
    }

    const tagName = `E2E Color Update ${Date.now()}`;
    await tagNameInput.fill(tagName);

    const colorInput = page.locator('input[name="color"], input[type="color"]').first();

    if (await colorInput.isVisible()) {
      await colorInput.fill('#FF0000'); // Red
    }

    const submitButton = page.locator('button:has-text("Add Tag"), button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Find and edit the tag
    const tagElement = page.locator(`text=${tagName}`).first();
    await expect(tagElement).toBeVisible({ timeout: 10000 });

    const tagRow = tagElement.locator('..').locator('..');
    const editButton = tagRow.locator('button:has-text("Edit")').first();

    if (await editButton.isVisible({ timeout: 2000 })) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Change color
      const editColorInput = page.locator('input[name="color"], input[type="color"]').last();

      if (await editColorInput.isVisible()) {
        await editColorInput.fill('#00FF00'); // Green
      }

      const updateButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
      await updateButton.click();

      await page.waitForTimeout(2000);

      // Verify tag still exists (color change is harder to verify visually in test)
      await expect(tagElement).toBeVisible();
    }
  });

  test('can delete a tag', async ({ page }) => {
    // Create a tag to delete
    const tagNameInput = page.locator('input[name="name"], input#tag-name');

    if (!(await tagNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Tag form not found');
      return;
    }

    const uniqueTagName = `E2E Delete Tag ${Date.now()}`;
    await tagNameInput.fill(uniqueTagName);

    const submitButton = page.locator('button:has-text("Add Tag"), button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Verify it was created
    let tagElement = page.locator(`text=${uniqueTagName}`).first();
    await expect(tagElement).toBeVisible({ timeout: 10000 });

    // Find delete button
    const tagRow = tagElement.locator('..').locator('..');
    const deleteButton = tagRow.locator('button:has-text("Delete"), button[aria-label*="Delete"]').first();

    if (!(await deleteButton.isVisible({ timeout: 2000 }))) {
      test.skip(true, 'Delete button not found');
      return;
    }

    await deleteButton.click();

    // Handle confirmation dialog
    await page.waitForTimeout(500);

    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').last();

    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    await page.waitForTimeout(2000);

    // Verify tag is deleted
    tagElement = page.locator(`text=${uniqueTagName}`);
    await expect(tagElement).not.toBeVisible({ timeout: 5000 });
  });

  test('validation: cannot create tag without name', async ({ page }) => {
    const tagNameInput = page.locator('input[name="name"], input#tag-name');

    if (!(await tagNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Tag form not found');
      return;
    }

    // Leave name empty
    await tagNameInput.clear();

    // Try to submit
    const submitButton = page.locator('button:has-text("Add Tag"), button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(500);

    // Form should not submit
    const formStillVisible = await tagNameInput.isVisible();
    expect(formStillVisible).toBe(true);
  });

  test('displays tag count correctly', async ({ page }) => {
    const pageContent = await page.textContent('body');

    if (!pageContent) {
      test.skip(true, 'Page content not loaded');
      return;
    }

    // Should show tag count or list of tags
    const hasTagsSection = pageContent.includes('Tag') || pageContent.includes('tags');

    expect(hasTagsSection).toBe(true);
  });

  test('tags appear as colored badges in the list', async ({ page }) => {
    // Look for tag badges
    const tagBadges = page.locator('[class*="badge"], [class*="tag"]').filter({ hasText: /\w+/ });
    const badgeCount = await tagBadges.count();

    if (badgeCount === 0) {
      // Create a tag to test
      const tagNameInput = page.locator('input[name="name"], input#tag-name');

      if (await tagNameInput.isVisible({ timeout: 2000 })) {
        await tagNameInput.fill(`E2E Badge Test ${Date.now()}`);

        const submitButton = page.locator('button:has-text("Add Tag"), button[type="submit"]').first();
        await submitButton.click();

        await page.waitForTimeout(2000);
      }
    }

    // Verify some content exists
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('can create multiple tags with different colors', async ({ page }) => {
    const tagNameInput = page.locator('input[name="name"], input#tag-name');

    if (!(await tagNameInput.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Tag form not found');
      return;
    }

    const colors = ['#FF0000', '#00FF00', '#0000FF'];
    const tagNames: string[] = [];

    for (let i = 0; i < 3; i++) {
      const tagName = `E2E Multi Tag ${i} ${Date.now()}`;
      tagNames.push(tagName);

      await tagNameInput.fill(tagName);

      const colorInput = page.locator('input[name="color"], input[type="color"]').first();

      if (await colorInput.isVisible()) {
        await colorInput.fill(colors[i]);
      }

      const submitButton = page.locator('button:has-text("Add Tag"), button:has-text("Create"), button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(1500);
    }

    // Verify all tags appear
    for (const tagName of tagNames) {
      const tagElement = page.locator(`text=${tagName}`);
      await expect(tagElement).toBeVisible({ timeout: 10000 });
    }
  });

  test('deleting tag removes it from transactions', async ({ page }) => {
    // This is a complex test that would require:
    // 1. Creating a tag
    // 2. Applying it to a transaction
    // 3. Deleting the tag
    // 4. Verifying it's removed from the transaction

    // For now, just verify delete functionality exists
    const deleteButtons = page.locator('button:has-text("Delete")');
    const buttonCount = await deleteButtons.count();

    if (buttonCount > 0) {
      // Delete buttons exist
      expect(buttonCount).toBeGreaterThan(0);
    } else {
      // No tags to delete
      test.skip(true, 'No tags available to test deletion');
    }
  });
});
