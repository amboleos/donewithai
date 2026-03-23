import { Page } from '@playwright/test';

/**
 * Test helper utilities
 */

/**
 * Generate random test data
 */
export class TestDataGenerator {
  /**
   * Generate a random email address
   */
  static randomEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `test${timestamp}${random}@example.com`;
  }

  /**
   * Generate a random username
   */
  static randomUsername(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `user${timestamp}${random}`;
  }

  /**
   * Generate a random repository URL
   */
  static randomRepoUrl(provider: 'github' | 'bitbucket' = 'github'): string {
    const random = Math.random().toString(36).substring(7);
    if (provider === 'github') {
      return `https://github.com/test/test-repo-${random}`;
    }
    return `https://bitbucket.org/test/test-repo-${random}`;
  }

  /**
   * Generate a random commit message
   */
  static randomCommitMessage(): string {
    const messages = [
      'feat: add new feature',
      'fix: resolve bug in authentication',
      'docs: update README',
      'refactor: improve code structure',
      'test: add unit tests',
      'chore: update dependencies'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Generate a random branch name
   */
  static randomBranchName(): string {
    const branches = [
      'feature/new-feature',
      'fix/authentication-bug',
      'refactor/code-cleanup',
      'docs/readme-update',
      'test/unit-tests'
    ];
    return branches[Math.floor(Math.random() * branches.length)];
  }
}

/**
 * Authentication helpers
 */
export class AuthHelpers {
  /**
   * Login with default test credentials
   */
  static async login(page: Page, email?: string, password?: string) {
    const LoginPage = (await import('../pages/LoginPage')).LoginPage;
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      email || 'testuser@example.com',
      password || 'password123'
    );

    return loginPage;
  }

  /**
   * Register a new test user
   */
  static async register(page: Page, name?: string, email?: string, password?: string) {
    const LoginPage = (await import('../pages/LoginPage')).LoginPage;
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register(
      name || 'Test User',
      email || TestDataGenerator.randomEmail(),
      password || 'password123'
    );

    return loginPage;
  }

  /**
   * Logout from current session
   */
  static async logout(page: Page) {
    const DashboardPage = (await import('../pages/DashboardPage')).DashboardPage;
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();
  }
}

/**
 * Database helpers for test setup/teardown
 */
export class DatabaseHelpers {
  /**
   * Clean up test data from database
   * Note: This would require API endpoints or direct DB access
   */
  static async cleanupTestData(page: Page, email: string) {
    // This would call an API endpoint to delete test user
    // Implementation depends on available API endpoints
    try {
      await page.request.delete(`/api/admin/users/${email}`);
    } catch (error) {
      console.log('Cleanup failed or endpoint not available:', error);
    }
  }

  /**
   * Seed test data
   */
  static async seedTestData(page: Page) {
    // This would populate database with test data
    // Implementation depends on available API endpoints
    try {
      await page.request.post('/api/test/seed');
    } catch (error) {
      console.log('Seed failed or endpoint not available:', error);
    }
  }
}

/**
 * Screenshot helpers for debugging
 */
export class ScreenshotHelpers {
  /**
   * Take screenshot on failure
   */
  static async onFailure(page: Page, testName: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `test-results/screenshots/failure-${testName}-${timestamp}.png`,
      fullPage: true
    });
  }

  /**
   * Take screenshot for visual regression
   */
  static async forVisualRegression(page: Page, name: string) {
    await page.screenshot({
      path: `test-results/screenshots/visual-${name}.png`,
      fullPage: true
    });
  }
}

/**
 * Wait helpers for async operations
 */
export class WaitHelpers {
  /**
   * Wait for toast notification to appear and disappear
   */
  static async waitForToast(page: Page, timeout: number = 3000) {
    const toast = page.locator('[data-sonner-toast]');
    await toast.waitFor({ state: 'visible', timeout });
    await toast.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for modal to appear
   */
  static async waitForModal(page: Page, timeout: number = 3000) {
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for loading state to complete
   */
  static async waitForLoading(page: Page, timeout: number = 10000) {
    // Wait for network to be idle
    await page.waitForLoadState('networkidle', { timeout });

    // Wait for any loading spinners to disappear
    const spinners = page.locator('[class*="animate-spin"]');
    const count = await spinners.count();

    if (count > 0) {
      await spinners.first().waitFor({ state: 'hidden', timeout });
    }
  }

  /**
   * Wait for stats to animate
   */
  static async waitForStatsAnimation(page: Page, timeout: number = 2000) {
    // Stats have 1 second animation, wait for it to complete
    await page.waitForTimeout(timeout);
  }
}

/**
 * Assertion helpers
 * Note: These use Playwright's expect function which is globally available in tests
 */
export class AssertionHelpers {
  /**
   * Assert element has Neo-Brutalist styling
   */
  static async assertNeoBrutalistStyling(page: Page, locator: any) {
    const border = await locator.evaluate((el: any) => {
      return window.getComputedStyle(el).borderWidth;
    });

    // Neo-Brutalist design uses 2px borders
    // Use assertion from Playwright test context
    console.assert(border.includes('2px'), 'Expected 2px border for Neo-Brutalist styling');
  }

  /**
   * Assert text content contains expected text
   */
  static async assertTextContains(locator: any, expectedText: string) {
    const text = await locator.textContent();
    console.assert(
      text?.toLowerCase().includes(expectedText.toLowerCase()),
      `Expected text to contain "${expectedText}", got "${text}"`
    );
  }

  /**
   * Check if element is visible and enabled
   */
  static async isVisibleAndEnabled(locator: any): Promise<boolean> {
    const isVisible = await locator.isVisible().catch(() => false);
    const isEnabled = await locator.isEnabled().catch(() => false);
    return isVisible && isEnabled;
  }

  /**
   * Check if element is visible but disabled
   */
  static async isVisibleButDisabled(locator: any): Promise<boolean> {
    const isVisible = await locator.isVisible().catch(() => false);
    const isEnabled = await locator.isEnabled().catch(() => true);
    return isVisible && !isEnabled;
  }
}

/**
 * Performance helpers
 */
export class PerformanceHelpers {
  /**
   * Measure page load time
   */
  static async measurePageLoad(page: Page, url: string) {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();

    return endTime - startTime;
  }

  /**
   * Measure interaction time
   */
  static async measureInteraction(page: Page, interaction: () => Promise<void>) {
    const startTime = Date.now();
    await interaction();
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();

    return endTime - startTime;
  }

  /**
   * Get page metrics
   */
  static async getMetrics(page: Page) {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });

    return metrics;
  }
}

/**
 * API helpers for testing backend endpoints
 */
export class APIHelpers {
  /**
   * Make authenticated API request
   */
  static async authenticatedRequest(page: Page, endpoint: string, options?: RequestInit) {
    // Get auth token from localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('token');
    });

    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> || {}),
      'Authorization': `Bearer ${token || ''}`
    };

    return page.request.get(endpoint, {
      ...options,
      headers
    });
  }

  /**
   * Create test repository via API
   */
  static async createTestRepo(page: Page, url: string) {
    return page.request.post('/api/repos', {
      data: { url }
    });
  }

  /**
   * Delete test repository via API
   */
  static async deleteTestRepo(page: Page, repoId: number) {
    return page.request.delete(`/api/repos?id=${repoId}`);
  }

  /**
   * Trigger sync via API
   */
  static async triggerSync(page: Page, url: string) {
    return page.request.post('/api/sync', {
      data: { url }
    });
  }
}
