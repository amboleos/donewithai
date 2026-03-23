import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Repo detail page object
 * Handles repo detail page interactions and verifications
 */
export class RepoPage extends BasePage {
  readonly url: string;
  readonly pageHeader: Locator;
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  readonly syncButton: Locator;
  readonly aiRecheckButton: Locator;
  readonly themeToggle: Locator;

  // Tab locators
  readonly overviewTab: Locator;
  readonly commitsTab: Locator;
  readonly branchesTab: Locator;
  readonly analyticsTab: Locator;

  // Stats
  readonly totalCommitsCard: Locator;
  readonly aiCommitsCard: Locator;
  readonly linesAddedCard: Locator;
  readonly linesRemovedCard: Locator;

  constructor(page: Page) {
    super(page);
    this.url = '/repo/';
    this.pageHeader = page.locator('header');
    this.pageTitle = page.locator('h1');
    this.backButton = page.locator('button:has-text("Back")');
    this.syncButton = page.locator('button:has-text("Sync")');
    this.aiRecheckButton = page.locator('button:has-text("AI Recheck")');
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');

    // Tabs
    this.overviewTab = page.locator('button:has-text("Overview")');
    this.commitsTab = page.locator('button:has-text("Commits")');
    this.branchesTab = page.locator('button:has-text("Branches")');
    this.analyticsTab = page.locator('button:has-text("Developer Stats")');

    // Stats cards
    this.totalCommitsCard = page.locator('[class*="border-2"]').filter({ hasText: 'Total Commits' });
    this.aiCommitsCard = page.locator('[class*="border-2"]').filter({ hasText: 'AI Generated' });
    this.linesAddedCard = page.locator('[class*="border-2"]').filter({ hasText: 'Lines Added' });
    this.linesRemovedCard = page.locator('[class*="border-2"]').filter({ hasText: 'Lines Removed' });
  }

  /**
   * Navigate to repo detail page
   */
  async goto(repoId?: string | number) {
    await super.goto(`${this.url}${repoId ?? ''}`);
    await this.waitForStable();
  }

  /**
   * Check if repo page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.pageTitle) && await this.isVisible(this.pageHeader);
  }

  /**
   * Click back button to return to dashboard
   */
  async goBack() {
    await this.backButton.click();
    await this.page.waitForURL('**/dashboard', { timeout: 5000 });
  }

  /**
   * Click sync button
   */
  async clickSync() {
    await this.syncButton.click();
  }

  /**
   * Click AI Recheck button
   */
  async clickAIRecheck() {
    await this.aiRecheckButton.click();
  }

  /**
   * Check if AI Recheck button is visible
   */
  async isAIRecheckButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.aiRecheckButton);
  }

  /**
   * Check if AI Recheck is in progress
   */
  async isAIRechecking(): Promise<boolean> {
    const button = this.aiRecheckButton;
    const isDisabled = await button.isDisabled();
    return isDisabled;
  }

  /**
   * Wait for AI Recheck to complete
   */
  async waitForAIRecheckComplete(timeout: number = 120000): Promise<boolean> {
    // Wait for button to be enabled again
    try {
      await this.page.waitForFunction(
        () => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent?.includes('AI Recheck'));
          return btn && !btn.disabled;
        },
        { timeout }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click on a specific tab
   */
  async clickTab(tab: 'overview' | 'commits' | 'branches' | 'analytics') {
    const tabMap = {
      overview: this.overviewTab,
      commits: this.commitsTab,
      branches: this.branchesTab,
      analytics: this.analyticsTab,
    };
    await tabMap[tab].click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get total commits count from stats card
   */
  async getTotalCommits(): Promise<number> {
    const text = await this.totalCommitsCard.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get AI commits count from stats card
   */
  async getAICommits(): Promise<number> {
    const text = await this.aiCommitsCard.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get AI percentage
   */
  async getAIPercentage(): Promise<number> {
    const text = await this.aiCommitsCard.textContent();
    const match = text?.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Check if Neo-Brutalist styling is applied
   */
  async hasNeoBrutalistDesign(): Promise<boolean> {
    const hasShadows = await this.page.locator('[style*="box-shadow"]').count() > 0;
    const hasBorders = await this.page.locator('[class*="border-2"]').count() > 0;
    return hasShadows || hasBorders;
  }
}
