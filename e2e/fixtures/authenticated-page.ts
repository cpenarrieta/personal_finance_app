import { test as base, expect } from '@playwright/test';

/**
 * Authenticated page fixture that automatically sets the E2E auth bypass header
 * This allows tests to run without going through the full OAuth flow
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Set the E2E bypass header for all requests
    await page.setExtraHTTPHeaders({
      'x-e2e-bypass-auth': 'true',
    });

    await use(page);
  },
});

export { expect };
