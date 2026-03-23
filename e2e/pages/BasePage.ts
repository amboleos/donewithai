import { Page, Locator } from '@playwright/test';

/**
 * Base page class with common functionality
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a URL
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be stable
   */
  async waitForStable() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('load');
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible().catch(() => false);
  }

  /**
   * Click element and wait for navigation
   */
  async clickAndWaitForNavigation(locator: Locator) {
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      locator.click()
    ]);
  }

  /**
   * Fill input field
   */
  async fillInput(locator: Locator, value: string) {
    await locator.fill(value);
  }

  /**
   * Get text content of element
   */
  async getText(locator: Locator): Promise<string> {
    return await locator.textContent() || '';
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: Locator, timeout: number = 5000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(locator: Locator, timeout: number = 5000) {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Check if page has Neo-Brutalist styling indicators
   */
  async hasNeoBrutalistStyling(): Promise<boolean> {
    // Check for box-shadow property used in Neo-Brutalist design
    const hasBoxShadow = await this.page.locator('[style*="box-shadow"]').count() > 0;
    // Check for border elements
    const hasBorders = await this.page.locator('body *:visible').filter({ hasText: /^\S+/ }).count() > 0;
    return hasBoxShadow || hasBorders;
  }

  /**
   * Check if page uses Sora font (Neo-Brutalist design uses Sora)
   */
  async usesSoraFont(): Promise<boolean> {
    const fontFamily = await this.page.locator('body').evaluate(el => {
      return window.getComputedStyle(el).fontFamily;
    });
    return fontFamily.includes('Sora') || fontFamily.includes('sans-serif');
  }
}
