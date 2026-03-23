import { test as base } from '@playwright/test';

/**
 * Extended test fixture with custom setup/teardown
 */
export const test = base.extend({
  // Custom page fixture with automatic error handling
  page: async ({ page }, use) => {
    // Set up error listeners
    page.on('pageerror', (error) => {
      console.error('Page error:', error);
    });

    page.on('requestfailed', (request) => {
      console.error('Request failed:', request.url(), request.failure());
    });

    // Use the page
    await use(page);

    // Cleanup after test
    await page.close();
  },

  // Custom context fixture with base URL
  context: async ({ context }, use) => {
    // Set default timeout
    context.setDefaultTimeout(30000);

    // Use the context
    await use(context);
  }
});

export { expect } from '@playwright/test';
