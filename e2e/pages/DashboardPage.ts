import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard page object
 * Handles dashboard interactions and verifications
 */
export class DashboardPage extends BasePage {
  readonly url: string;
  readonly pageHeader: Locator;
  readonly pageTitle: Locator;
  readonly logo: Locator;
  readonly userNameDisplay: Locator;
  readonly logoutButton: Locator;
  readonly adminButton: Locator;
  readonly addRepoButton: Locator;
  readonly statsCards: Locator;
  readonly repoList: Locator;
  readonly emptyState: Locator;
  readonly themeToggle: Locator;

  // Stat card locators
  readonly totalReposCard: Locator;
  readonly githubReposCard: Locator;
  readonly bitbucketReposCard: Locator;
  readonly syncedReposCard: Locator;

  constructor(page: Page) {
    super(page);
    this.url = '/dashboard';
    this.pageHeader = page.locator('header');
    this.pageTitle = page.locator('h1:has-text("Dashboard")');
    this.logo = page.locator('text=DoneWithAI');
    this.userNameDisplay = page.locator('[class*="font-mono"]').filter({ hasText: /^\S+@\S+$/ });
    this.logoutButton = page.locator('button:has-text("Logout")');
    this.adminButton = page.locator('a[href="/admin"]');
    this.addRepoButton = page.locator('button:has-text("Add Repository")');
    this.statsCards = page.locator('[class*="grid"]').filter({ has: page.locator('text=/Total Repos|GitHub|Bitbucket|Synced/i') });
    this.repoList = page.locator('[class*="repo"]');
    this.emptyState = page.locator('text=No Repositories');
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');

    // Individual stat cards
    this.totalReposCard = page.locator('text=Total Repos');
    this.githubReposCard = page.locator('text=GitHub');
    this.bitbucketReposCard = page.locator('text=Bitbucket');
    this.syncedReposCard = page.locator('text=Synced');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForStable();
  }

  /**
   * Check if dashboard is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.pageTitle) && await this.isVisible(this.pageHeader);
  }

  /**
   * Check if logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    return await this.isVisible(this.logo);
  }

  /**
   * Get user name from display
   */
  async getUserName(): Promise<string> {
    return await this.getText(this.userNameDisplay);
  }

  /**
   * Click logout button
   */
  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login', { timeout: 5000 });
  }

  /**
   * Navigate to admin page
   */
  async gotoAdmin() {
    await this.adminButton.click();
    await this.page.waitForURL('**/admin', { timeout: 5000 });
  }

  /**
   * Check if admin button is visible
   */
  async isAdminButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.adminButton);
  }

  /**
   * Check if add repo button is visible
   */
  async isAddRepoButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.addRepoButton);
  }

  /**
   * Click add repository button
   */
  async clickAddRepo() {
    await this.addRepoButton.click();
  }

  /**
   * Check if stats cards are displayed
   */
  async hasStatsCards(): Promise<boolean> {
    return await this.isVisible(this.statsCards);
  }

  /**
   * Get stat value from stat card
   */
  async getStatValue(statName: string): Promise<number> {
    const card = this.page.locator(`text=${statName}`).locator('xpath=ancestor::div[contains(@class, "border-2")]').first();
    const valueText = await this.getText(card.locator('text=/^\\d+$/'));
    return parseInt(valueText || '0', 10);
  }

  /**
   * Get total repos count
   */
  async getTotalReposCount(): Promise<number> {
    return await this.getStatValue('Total Repos');
  }

  /**
   * Check if repo list is displayed
   */
  async hasRepoList(): Promise<boolean> {
    return await this.isVisible(this.repoList.first()).catch(() => false);
  }

  /**
   * Check if empty state is displayed
   */
  async isEmptyStateDisplayed(): Promise<boolean> {
    return await this.isVisible(this.emptyState);
  }

  /**
   * Get number of repos displayed
   */
  async getRepoCount(): Promise<number> {
    const repos = this.page.locator('[class*="border-2"]').filter({ has: this.page.locator('text=github.com|bitbucket.org') });
    return await repos.count();
  }

  /**
   * Check if Neo-Brutalist styling is applied
   */
  async hasNeoBrutalistDesign(): Promise<boolean> {
    // Check for box-shadows and borders
    const hasShadows = await this.page.locator('[style*="box-shadow"]').count() > 0;
    const hasBorders = await this.page.locator('[class*="border-2"]').count() > 0;

    // Check for Sora font usage
    const usesSora = await this.usesSoraFont();

    // Check for dot pattern background
    const hasDotPattern = await this.page.locator('.bg-dots').count() > 0;

    return hasShadows || hasBorders || usesSora || hasDotPattern;
  }

  /**
   * Get repository card by name
   */
  async getRepoCard(repoName: string): Promise<Locator | null> {
    const card = this.page.locator(`text=${repoName}`).locator('xpath=ancestor::div[contains(@class, "border-2")]').first();
    if (await this.isVisible(card)) {
      return card;
    }
    return null;
  }

  /**
   * Check if specific repo is displayed
   */
  async isRepoDisplayed(repoName: string): Promise<boolean> {
    return await this.page.locator(`text=${repoName}`).count() > 0;
  }

  /**
   * Click sync button for a specific repo
   */
  async syncRepo(repoName: string) {
    const repoCard = await this.getRepoCard(repoName);
    if (repoCard) {
      const syncButton = repoCard.locator('button:has-text("Sync")');
      await syncButton.click();
    }
  }

  /**
   * Click delete button for a specific repo
   */
  async deleteRepo(repoName: string) {
    const repoCard = await this.getRepoCard(repoName);
    if (repoCard) {
      const deleteButton = repoCard.locator('button:has-text("Delete")');
      await deleteButton.click();
      // Confirm deletion
      await this.page.locator('button:has-text("Confirm")').click();
    }
  }

  /**
   * Wait for stats to load
   */
  async waitForStats() {
    await this.waitForVisible(this.statsCards, 5000);
  }

  /**
   * Toggle theme
   */
  async toggleTheme() {
    await this.themeToggle.click();
  }
}
