import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin page object
 * Handles admin panel interactions and verifications
 */
export class AdminPage extends BasePage {
  readonly url: string;
  readonly pageHeader: Locator;
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  readonly adminTabs: Locator;
  readonly reposTab: Locator;
  readonly mappingsTab: Locator;
  readonly aiFlagsTab: Locator;
  readonly keywordsTab: Locator;
  readonly jobsTab: Locator;
  readonly themeToggle: Locator;

  // AI Flags tab specific locators
  readonly commitsTab: Locator;
  readonly branchesTab: Locator;
  readonly searchInput: Locator;
  readonly patternFilterAll: Locator;
  readonly patternFilterAI: Locator;
  readonly patternFilterHuman: Locator;
  readonly patternFilterUnknown: Locator;
  readonly codeFilterAll: Locator;
  readonly codeFilterAgentic: Locator;
  readonly codeFilterHuman: Locator;
  readonly codeFilterNotAnalyzed: Locator;
  readonly commitsTable: Locator;
  readonly branchesTable: Locator;
  readonly dateSortButton: Locator;
  readonly statusSortButton: Locator;

  // AI Flags tab analyze buttons
  // Note: These are convenience locators for direct access in tests.
  // Methods like clickAnalyzeCommit/clickAnalyzeBranch recreate locators locally
  // to ensure they target specific rows correctly.
  readonly analyzeCommitButton: Locator;
  readonly analyzeBranchButton: Locator;
  readonly analysisModal: Locator;
  readonly closeModalButton: Locator;

  constructor(page: Page) {
    super(page);
    this.url = '/admin';
    this.pageHeader = page.locator('header');
    this.pageTitle = page.locator('text=Admin Console');
    this.backButton = page.locator('button:has-text("Back")');
    this.adminTabs = page.locator('[class*="flex items-center gap-2"]');
    this.reposTab = page.locator('button:has-text("Repositories")');
    this.mappingsTab = page.locator('button:has-text("User Mapping")');
    this.aiFlagsTab = page.locator('button:has-text("AI Flags")');
    this.keywordsTab = page.locator('button:has-text("Keywords")');
    this.jobsTab = page.locator('button:has-text("Jobs Report")');
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');

    // AI Flags tab locators
    this.commitsTab = page.locator('button:has-text("COMMITS")');
    this.branchesTab = page.locator('button:has-text("BRANCHES")');
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.patternFilterAll = page.locator('button:has-text("ALL"):has-text("PATTERN")');
    this.patternFilterAI = page.locator('button:has-text("AI")');
    this.patternFilterHuman = page.locator('button:has-text("HUMAN")');
    this.patternFilterUnknown = page.locator('button:has-text("UNKNOWN")');
    this.codeFilterAll = page.locator('button:has-text("ALL"):has-text("CODE")');
    this.codeFilterAgentic = page.locator('button:has-text("AGENTIC")');
    this.codeFilterHuman = page.locator('button:has-text("HUMAN")');
    this.codeFilterNotAnalyzed = page.locator('button:has-text("NOT ANALYZED")');
    this.commitsTable = page.locator('table:has(th:has-text("MESSAGE"))');
    this.branchesTable = page.locator('table:has(th:has-text("NAME"))');
    this.dateSortButton = page.locator('th:has-text("DATE")');
    this.statusSortButton = page.locator('th:has-text("STATUS")');

    // Analyze button locators
    this.analyzeCommitButton = this.commitsTable.locator('button:has-text("ANALYZE")');
    this.analyzeBranchButton = this.branchesTable.locator('button:has-text("ANALYZE")');
    this.analysisModal = page.locator('[class*="modal"], [role="dialog"]');
    this.closeModalButton = page.locator('button:has-text("Close"), button[aria-label="Close"]');
  }

  /**
   * Navigate to admin page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForStable();
  }

  /**
   * Check if admin page is loaded
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
   * Click on Repositories tab
   */
  async clickReposTab() {
    await this.reposTab.click();
  }

  /**
   * Click on User Mapping tab
   */
  async clickMappingsTab() {
    await this.mappingsTab.click();
  }

  /**
   * Click on AI Flags tab
   */
  async clickAIFlagsTab() {
    await this.aiFlagsTab.click();
    await this.waitForStable();
  }

  /**
   * Click on Keywords tab
   */
  async clickKeywordsTab() {
    await this.keywordsTab.click();
  }

  /**
   * Click on Jobs Report tab
   */
  async clickJobsTab() {
    await this.jobsTab.click();
  }

  /**
   * Check if specific tab is active
   */
  async isTabActive(tabName: string): Promise<boolean> {
    const tab = this.page.locator(`button:has-text("${tabName}")`);
    const isActive = await tab.getAttribute('class');
    return isActive?.includes('bg-[var(--primary)]') || false;
  }

  /**
   * In AI Flags tab, click on Commits sub-tab
   */
  async clickCommitsTab() {
    await this.commitsTab.click();
  }

  /**
   * In AI Flags tab, click on Branches sub-tab
   */
  async clickBranchesTab() {
    await this.branchesTab.click();
  }

  /**
   * Search for commits/branches
   */
  async search(query: string) {
    await this.fillInput(this.searchInput, query);
    await this.page.waitForTimeout(500); // Wait for debounced search
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by pattern status
   */
  async filterByPattern(filter: 'all' | 'ai' | 'human' | 'unknown') {
    const filterMap = {
      'all': this.patternFilterAll,
      'ai': this.patternFilterAI,
      'human': this.patternFilterHuman,
      'unknown': this.patternFilterUnknown
    };
    await filterMap[filter].click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by code analysis status
   */
  async filterByCodeAnalysis(filter: 'all' | 'agentic' | 'human' | 'not_analyzed') {
    const filterMap = {
      'all': this.codeFilterAll,
      'agentic': this.codeFilterAgentic,
      'human': this.codeFilterHuman,
      'not_analyzed': this.codeFilterNotAnalyzed
    };
    await filterMap[filter].click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Sort commits/branches by date
   */
  async sortByDate() {
    await this.dateSortButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Sort commits/branches by status
   */
  async sortByStatus() {
    await this.statusSortButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if commits table is visible
   */
  async isCommitsTableVisible(): Promise<boolean> {
    return await this.isVisible(this.commitsTable);
  }

  /**
   * Check if branches table is visible
   */
  async isBranchesTableVisible(): Promise<boolean> {
    return await this.isVisible(this.branchesTable);
  }

  /**
   * Get number of commits displayed in table
   */
  async getCommitsCount(): Promise<number> {
    const rows = this.commitsTable.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Get number of branches displayed in table
   */
  async getBranchesCount(): Promise<number> {
    const rows = this.branchesTable.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Get commit data from table
   */
  async getCommitData(rowIndex: number): Promise<{
    message: string;
    author: string;
    repo: string;
    date: string;
    pattern: string;
    codeAnalysis: string;
  }> {
    const row = this.commitsTable.locator('tbody tr').nth(rowIndex);
    const cells = row.locator('td');
    return {
      message: await this.getText(cells.nth(0)),
      author: await this.getText(cells.nth(1)),
      repo: await this.getText(cells.nth(2)),
      date: await this.getText(cells.nth(3)),
      pattern: await this.getText(cells.nth(4)),
      codeAnalysis: await this.getText(cells.nth(5))
    };
  }

  /**
   * Get branch data from table
   */
  async getBranchData(rowIndex: number): Promise<{
    name: string;
    repo: string;
    pattern: string;
    codeAnalysis: string;
  }> {
    const row = this.branchesTable.locator('tbody tr').nth(rowIndex);
    const cells = row.locator('td');
    return {
      name: await this.getText(cells.nth(0)),
      repo: await this.getText(cells.nth(1)),
      pattern: await this.getText(cells.nth(2)),
      codeAnalysis: await this.getText(cells.nth(3))
    };
  }

  /**
   * Check if commit has AI badge
   */
  async hasAIBadge(rowIndex: number): Promise<boolean> {
    const row = this.commitsTable.locator('tbody tr').nth(rowIndex);
    const aiBadge = row.locator('text=AI');
    return await this.isVisible(aiBadge);
  }

  /**
   * Check if commit has Human badge
   */
  async hasHumanBadge(rowIndex: number): Promise<boolean> {
    const row = this.commitsTable.locator('tbody tr').nth(rowIndex);
    const humanBadge = row.locator('text=HUMAN');
    return await this.isVisible(humanBadge);
  }

  /**
   * Check if commit has Agentic AI badge
   */
  async hasAgenticBadge(rowIndex: number): Promise<boolean> {
    const row = this.commitsTable.locator('tbody tr').nth(rowIndex);
    const agenticBadge = row.locator('text=AGENTIC AI');
    return await this.isVisible(agenticBadge);
  }

  /**
   * Check if commit has Human Assisted badge
   */
  async hasHumanAssistedBadge(rowIndex: number): Promise<boolean> {
    const row = this.commitsTable.locator('tbody tr').nth(rowIndex);
    const humanAssistedBadge = row.locator('text=HUMAN ASSISTED');
    return await this.isVisible(humanAssistedBadge);
  }

  /**
   * Check if table is empty
   */
  async isTableEmpty(): Promise<boolean> {
    const emptyMessage = this.page.locator('text=No matching');
    return await this.isVisible(emptyMessage);
  }

  /**
   * Toggle AI flag for a commit
   */
  async toggleCommitAI(rowIndex: number) {
    const row = this.commitsTable.locator('tbody tr').nth(rowIndex);
    const toggleButton = row.locator('button:has-text("SET_AI"), button:has-text("SET_HUMAN")');
    await toggleButton.click();
  }

  /**
   * Toggle AI flag for a branch
   */
  async toggleBranchAI(rowIndex: number) {
    const row = this.branchesTable.locator('tbody tr').nth(rowIndex);
    const toggleButton = row.locator('button:has-text("SET_AI"), button:has-text("SET_HUMAN")');
    await toggleButton.click();
  }

  /**
   * Click ANALYZE button for a commit
   */
  async clickAnalyzeCommit(rowIndex: number) {
    const row = this.commitsTable.locator('tbody tr').nth(rowIndex);
    const analyzeButton = row.locator('button:has-text("ANALYZE")');
    await analyzeButton.click();
  }

  /**
   * Click ANALYZE button for a branch
   */
  async clickAnalyzeBranch(rowIndex: number) {
    const row = this.branchesTable.locator('tbody tr').nth(rowIndex);
    const analyzeButton = row.locator('button:has-text("ANALYZE")');
    await analyzeButton.click();
  }

  /**
   * Check if analyze button is disabled (analyzing in progress)
   */
  async isAnalyzeInProgress(rowIndex: number, type: 'commit' | 'branch' = 'commit'): Promise<boolean> {
    const table = type === 'commit' ? this.commitsTable : this.branchesTable;
    const row = table.locator('tbody tr').nth(rowIndex);
    const analyzeButton = row.locator('button:has-text("ANALYZING"), button:has-text("ANALYZE")');
    const text = await analyzeButton.textContent();
    return text?.includes('ANALYZING') || false;
  }

  /**
   * Wait for analyze to complete
   */
  async waitForAnalyzeComplete(rowIndex: number, type: 'commit' | 'branch' = 'commit', timeout: number = 60000): Promise<boolean> {
    try {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        try {
          if (!(await this.isAnalyzeInProgress(rowIndex, type))) {
            return true;
          }
        } catch {
          // Row might not exist yet, continue waiting
        }
        await this.page.waitForTimeout(1000);
      }
      return false;
    } catch (error) {
      console.error('Error waiting for analyze complete:', error);
      return false;
    }
  }

  /**
   * Check if analysis modal is visible
   */
  async isAnalysisModalVisible(): Promise<boolean> {
    return await this.isVisible(this.analysisModal);
  }

  /**
   * Close analysis modal
   */
  async closeAnalysisModal() {
    if (await this.isAnalysisModalVisible()) {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Click Recheck AI button in Repos tab for a specific repo
   */
  async clickRecheckAI(repoName: string) {
    const repoRow = this.page.locator(`tr:has-text("${repoName}")`);
    const recheckButton = repoRow.locator('button[title="Recheck AI"], button:has(svg[class*="brain"])');
    await recheckButton.click();
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
   * Get stats from stats bar
   */
  async getStats(): Promise<{
    commits: number;
    branches: number;
    patternAI: number;
    agentic: number;
    humanAssisted: number;
    notAnalyzed: number;
  }> {
    const statsBar = this.page.locator('text=stats').locator('xpath=ancestor::div[contains(@class, "bg-[var(--muted)]")]');

    const getTextContent = async (label: string) => {
      const element = statsBar.locator(`text=${label}`).locator('xpath=following-sibling::*[1]');
      const text = await this.getText(element);
      return parseInt(text || '0', 10);
    };

    return {
      commits: await getTextContent('commits:'),
      branches: await getTextContent('branches:'),
      patternAI: await getTextContent('pattern_ai:'),
      agentic: await getTextContent('agentic:'),
      humanAssisted: await getTextContent('human_assisted:'),
      notAnalyzed: await getTextContent('not_analyzed:')
    };
  }
}
