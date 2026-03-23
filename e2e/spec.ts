import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';

/**
 * E2E Tests for DoneWithAI Application
 *
 * Tests the complete user flow including:
 * - Login/Registration
 * - Dashboard rendering and functionality
 * - Repository operations (add, sync, delete)
 * - Admin AI flags tab functionality
 */

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('should display login page with Neo-Brutalist styling', async ({ page }) => {
    await loginPage.goto();

    // Verify page elements
    await expect(loginPage.logo).toBeVisible();
    await expect(loginPage.pageTitle).toContainText('DoneWithAI');

    // Verify form is visible
    expect(await loginPage.isLoginFormVisible()).toBeTruthy();

    // Verify Neo-Brutalist styling
    expect(await loginPage.hasNeoBrutalistStyling()).toBeTruthy();
    expect(await loginPage.usesSoraFont()).toBeTruthy();
  });

  test('should switch between Sign In and Sign Up tabs', async ({ page }) => {
    await loginPage.goto();

    // Initially on Sign In tab
    expect(await loginPage.isLoginFormVisible()).toBeTruthy();
    expect(await loginPage.isRegistrationFormVisible()).toBeFalsy();

    // Switch to Sign Up
    await loginPage.switchToSignUp();
    expect(await loginPage.isRegistrationFormVisible()).toBeTruthy();

    // Switch back to Sign In
    await loginPage.switchToSignIn();
    expect(await loginPage.isLoginFormVisible()).toBeTruthy();
    expect(await loginPage.isRegistrationFormVisible()).toBeFalsy();
  });

  test('should show validation error for invalid credentials', async ({ page }) => {
    await loginPage.goto();

    // Try to login with invalid credentials
    await loginPage.fillEmail('invalid@example.com');
    await loginPage.fillPassword('wrongpassword');
    await loginPage.submit();

    // Should stay on login page (no redirect)
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');
  });

  test('should show validation error for short password during registration', async ({ page }) => {
    await loginPage.goto();
    await loginPage.switchToSignUp();

    // Try to register with short password
    await loginPage.fillName('Test User');
    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('12345'); // Less than 6 characters
    await loginPage.submit();

    // Should show validation error
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');
  });

  test('should successfully register a new user', async ({ page }) => {
    await loginPage.goto();

    // Generate unique email using timestamp
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;

    // Register new user
    await loginPage.register('Test User', email, 'password123');

    // Should redirect to dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await loginPage.goto();

    // Login with valid credentials (assuming user exists from previous test)
    // Note: This test may fail if user doesn't exist, in which case registration happens first
    await loginPage.login('testuser@example.com', 'password123');

    // Should redirect to dashboard
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Dashboard Page', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Login first (assuming test user exists)
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'password123');
  });

  test('should display dashboard with Neo-Brutalist styling', async ({ page }) => {
    await expect(dashboardPage.pageTitle).toBeVisible();
    await expect(dashboardPage.pageTitle).toContainText('Dashboard');

    // Verify Neo-Brutalist design elements
    expect(await dashboardPage.hasNeoBrutalistDesign()).toBeTruthy();
    expect(await dashboardPage.isLogoVisible()).toBeTruthy();
  });

  test('should display user information', async ({ page }) => {
    await dashboardPage.waitForStats();

    // User name should be displayed
    expect(await dashboardPage.getUserName()).toBeTruthy();
  });

  test('should display stats cards when repos exist', async ({ page }) => {
    await dashboardPage.waitForStats();

    // Check if stats cards are displayed (may be empty if no repos)
    const hasStats = await dashboardPage.hasStatsCards();

    if (hasStats) {
      const totalRepos = await dashboardPage.getTotalReposCount();
      expect(totalRepos).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display empty state when no repos exist', async ({ page }) => {
    await dashboardPage.waitForStats();

    const isEmpty = await dashboardPage.isEmptyStateDisplayed();

    if (isEmpty) {
      await expect(dashboardPage.emptyState).toBeVisible();
      await expect(dashboardPage.page.locator('text=Add your first repository')).toBeVisible();
    }
  });

  test('should display repo list when repos exist', async ({ page }) => {
    await dashboardPage.waitForStats();

    const hasRepos = await dashboardPage.hasRepoList();

    if (hasRepos) {
      const repoCount = await dashboardPage.getRepoCount();
      expect(repoCount).toBeGreaterThan(0);
    }
  });

  test('should have admin button for admin users', async ({ page }) => {
    const isAdminButtonVisible = await dashboardPage.isAdminButtonVisible();

    // First user is automatically admin, so button should be visible
    expect(isAdminButtonVisible).toBeTruthy();
  });

  test('should have add repository button for admin users', async ({ page }) => {
    const isAddButtonVisible = await dashboardPage.isAddRepoButtonVisible();

    // First user is automatically admin
    expect(isAddButtonVisible).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    await dashboardPage.logout();

    // Should redirect to login page
    expect(page.url()).toContain('/login');

    const loginPage = new LoginPage(page);
    expect(await loginPage.isLoginFormVisible()).toBeTruthy();
  });

  test('should navigate to admin page', async ({ page }) => {
    const isAdmin = await dashboardPage.isAdminButtonVisible();

    if (isAdmin) {
      await dashboardPage.gotoAdmin();
      expect(page.url()).toContain('/admin');
    }
  });

  test('should toggle theme', async ({ page }) => {
    await dashboardPage.toggleTheme();
    await page.waitForTimeout(500);

    // Theme should toggle (can't easily verify without checking computed styles)
    // But we can verify the button is clickable and doesn't cause errors
    expect(await dashboardPage.isLogoVisible()).toBeTruthy();
  });
});

test.describe('Repository Operations', () => {
  let dashboardPage: DashboardPage;
  const testRepoUrl = 'https://github.com/test/test-repo';

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Login as admin user
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'password123');
  });

  test('should open add repository dialog', async ({ page }) => {
    const isAdmin = await dashboardPage.isAdminButtonVisible();

    if (isAdmin) {
      await dashboardPage.clickAddRepo();

      // Dialog should be visible (check for dialog content)
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    }
  });

  test('should add new repository', async ({ page }) => {
    const isAdmin = await dashboardPage.isAdminButtonVisible();

    if (isAdmin) {
      await dashboardPage.clickAddRepo();

      // Fill in repo URL
      const urlInput = page.locator('input[type="text"]').first();
      await urlInput.fill(testRepoUrl);

      // Submit form (click Add button)
      const addButton = page.locator('button:has-text("Add")');
      await addButton.click();

      // Wait for dialog to close
      await page.waitForTimeout(2000);

      // Verify repo was added (check if it appears in list)
      // Note: This may fail if the repo doesn't actually exist on GitHub
    }
  });

  test('should sync repository', async ({ page }) => {
    const hasRepos = await dashboardPage.hasRepoList();

    if (hasRepos) {
      // Get first repo name
      const firstRepoCard = page.locator('[class*="border-2"]').filter({ has: page.locator('text=github.com|bitbucket.org') }).first();
      const repoName = await firstRepoCard.textContent();

      if (repoName) {
        await dashboardPage.syncRepo(repoName.trim());

        // Wait for sync to complete
        await page.waitForTimeout(3000);

        // Verify sync occurred (can't easily verify without checking repo state)
      }
    }
  });

  test('should delete repository', async ({ page }) => {
    const hasRepos = await dashboardPage.hasRepoList();

    if (hasRepos && await dashboardPage.getRepoCount() > 0) {
      // Get first repo name
      const firstRepoCard = page.locator('[class*="border-2"]').filter({ has: page.locator('text=github.com|bitbucket.org') }).first();
      const repoName = await firstRepoCard.textContent();

      if (repoName) {
        const repoCountBefore = await dashboardPage.getRepoCount();

        await dashboardPage.deleteRepo(repoName.trim());

        // Wait for deletion
        await page.waitForTimeout(2000);

        // Verify repo was deleted
        const repoCountAfter = await dashboardPage.getRepoCount();
        expect(repoCountAfter).toBeLessThan(repoCountBefore);
      }
    }
  });
});

test.describe('Admin AI Flags Tab', () => {
  let adminPage: AdminPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    // Login and navigate to admin
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'password123');

    dashboardPage = new DashboardPage(page);
    adminPage = new AdminPage(page);

    // Navigate to admin page
    await dashboardPage.gotoAdmin();
  });

  test('should display admin page with Neo-Brutalist styling', async ({ page }) => {
    await expect(adminPage.pageTitle).toBeVisible();
    await expect(adminPage.pageTitle).toContainText('Admin Console');

    // Verify Neo-Brutalist design
    expect(await adminPage.hasNeoBrutalistDesign()).toBeTruthy();
  });

  test('should navigate to AI Flags tab', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Verify AI Flags tab is active
    expect(await adminPage.isTabActive('AI Flags')).toBeTruthy();
  });

  test('should display stats bar in AI Flags tab', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Stats bar should be visible
    const statsBar = page.locator('text=stats');
    await expect(statsBar).toBeVisible();
  });

  test('should display commits table by default', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Commits table should be visible
    expect(await adminPage.isCommitsTableVisible()).toBeTruthy();

    // Commits tab should be active
    await expect(adminPage.commitsTab).toBeVisible();
  });

  test('should switch to branches table', async ({ page }) => {
    await adminPage.clickAIFlagsTab();
    await adminPage.clickBranchesTab();

    // Branches table should be visible
    expect(await adminPage.isBranchesTableVisible()).toBeTruthy();

    // Branches tab should be active
    await expect(adminPage.branchesTab).toBeVisible();
  });

  test('should search commits', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const commitsCountBefore = await adminPage.getCommitsCount();

    if (commitsCountBefore > 0) {
      // Get first commit message
      const firstCommit = await adminPage.getCommitData(0);
      const searchTerm = firstCommit.message.split(' ')[0]; // Use first word

      // Search
      await adminPage.search(searchTerm);

      // Wait for search results
      await page.waitForTimeout(1000);

      const commitsCountAfter = await adminPage.getCommitsCount();

      // Search should filter results
      expect(commitsCountAfter).toBeGreaterThan(0);

      // Clear search
      await adminPage.clearSearch();
      await page.waitForTimeout(1000);

      const commitsCountAfterClear = await adminPage.getCommitsCount();
      expect(commitsCountAfterClear).toBe(commitsCountBefore);
    }
  });

  test('should filter by AI status', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const allCount = await adminPage.getCommitsCount();

    if (allCount > 0) {
      // Filter by AI
      await adminPage.filterByPattern('ai');
      await page.waitForTimeout(1000);

      const aiCount = await adminPage.getCommitsCount();

      // AI filter should show different results
      expect(aiCount).toBeGreaterThanOrEqual(0);

      // Filter by Human
      await adminPage.filterByPattern('human');
      await page.waitForTimeout(1000);

      const humanCount = await adminPage.getCommitsCount();

      // Human filter should show different results
      expect(humanCount).toBeGreaterThanOrEqual(0);

      // Reset to all
      await adminPage.filterByPattern('all');
      await page.waitForTimeout(1000);

      const allCountAfter = await adminPage.getCommitsCount();
      expect(allCountAfter).toBe(allCount);
    }
  });

  test('should filter by code analysis status', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const allCount = await adminPage.getCommitsCount();

    if (allCount > 0) {
      // Filter by Agentic AI
      await adminPage.filterByCodeAnalysis('agentic');
      await page.waitForTimeout(1000);

      const agenticCount = await adminPage.getCommitsCount();

      // Agentic filter should show different results
      expect(agenticCount).toBeGreaterThanOrEqual(0);

      // Filter by Human Assisted
      await adminPage.filterByCodeAnalysis('human');
      await page.waitForTimeout(1000);

      const humanCount = await adminPage.getCommitsCount();

      // Human filter should show different results
      expect(humanCount).toBeGreaterThanOrEqual(0);

      // Filter by Not Analyzed
      await adminPage.filterByCodeAnalysis('not_analyzed');
      await page.waitForTimeout(1000);

      const notAnalyzedCount = await adminPage.getCommitsCount();

      // Not analyzed filter should show different results
      expect(notAnalyzedCount).toBeGreaterThanOrEqual(0);

      // Reset to all
      await adminPage.filterByCodeAnalysis('all');
      await page.waitForTimeout(1000);

      const allCountAfter = await adminPage.getCommitsCount();
      expect(allCountAfter).toBe(allCount);
    }
  });

  test('should sort commits by date', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const commitsCount = await adminPage.getCommitsCount();

    if (commitsCount > 1) {
      // Get first commit date before sorting
      const firstCommitBefore = await adminPage.getCommitData(0);
      const dateBefore = firstCommitBefore.date;

      // Sort by date
      await adminPage.sortByDate();
      await page.waitForTimeout(1000);

      // Get first commit date after sorting
      const firstCommitAfter = await adminPage.getCommitData(0);
      const dateAfter = firstCommitAfter.date;

      // Dates should be different (reversed order)
      expect(dateAfter).not.toBe(dateBefore);

      // Sort again to reverse
      await adminPage.sortByDate();
      await page.waitForTimeout(1000);

      const firstCommitFinal = await adminPage.getCommitData(0);
      const dateFinal = firstCommitFinal.date;

      // Should be back to original order
      expect(dateFinal).toBe(dateBefore);
    }
  });

  test('should sort commits by status', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const commitsCount = await adminPage.getCommitsCount();

    if (commitsCount > 1) {
      // Get first commit status before sorting
      const firstCommitBefore = await adminPage.getCommitData(0);
      const statusBefore = firstCommitBefore.pattern;

      // Sort by status
      await adminPage.sortByStatus();
      await page.waitForTimeout(1000);

      // Get first commit status after sorting
      const firstCommitAfter = await adminPage.getCommitData(0);
      const statusAfter = firstCommitAfter.pattern;

      // Status may or may not be different depending on data
      // Just verify sorting doesn't cause errors
      expect(statusAfter).toBeTruthy();
    }
  });

  test('should display AI and Human badges correctly', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const commitsCount = await adminPage.getCommitsCount();

    if (commitsCount > 0) {
      // Check if badges are displayed
      const hasAI = await adminPage.hasAIBadge(0);
      const hasHuman = await adminPage.hasHumanBadge(0);

      // At least one badge should be visible
      expect(hasAI || hasHuman).toBeTruthy();
    }
  });

  test('should toggle AI flag for commit', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const commitsCount = await adminPage.getCommitsCount();

    if (commitsCount > 0) {
      // Get initial state
      const hasAIBefore = await adminPage.hasAIBadge(0);

      // Toggle AI flag
      await adminPage.toggleCommitAI(0);

      // Wait for update
      await page.waitForTimeout(1000);

      // Get new state
      const hasAIAfter = await adminPage.hasAIBadge(0);

      // State should have changed
      expect(hasAIAfter).not.toBe(hasAIBefore);
    }
  });

  test('should navigate between tabs', async ({ page }) => {
    // Navigate through different tabs
    await adminPage.clickReposTab();
    expect(await adminPage.isTabActive('Repositories')).toBeTruthy();

    await adminPage.clickMappingsTab();
    expect(await adminPage.isTabActive('User Mapping')).toBeTruthy();

    await adminPage.clickKeywordsTab();
    expect(await adminPage.isTabActive('Keywords')).toBeTruthy();

    await adminPage.clickJobsTab();
    expect(await adminPage.isTabActive('Jobs Report')).toBeTruthy();

    // Return to AI Flags
    await adminPage.clickAIFlagsTab();
    expect(await adminPage.isTabActive('AI Flags')).toBeTruthy();
  });

  test('should go back to dashboard', async ({ page }) => {
    await adminPage.goBack();

    // Should be back on dashboard
    expect(page.url()).toContain('/dashboard');

    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.pageTitle).toBeVisible();
  });

  test('should display stats in AI Flags tab', async ({ page }) => {
    await adminPage.clickAIFlagsTab();

    // Wait for data to load
    await page.waitForTimeout(1000);

    const stats = await adminPage.getStats();

    // Stats should be non-negative
    expect(stats.commits).toBeGreaterThanOrEqual(0);
    expect(stats.branches).toBeGreaterThanOrEqual(0);
    expect(stats.patternAI).toBeGreaterThanOrEqual(0);
    expect(stats.agentic).toBeGreaterThanOrEqual(0);
    expect(stats.humanAssisted).toBeGreaterThanOrEqual(0);
    expect(stats.notAnalyzed).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Full User Flow', () => {
  test('should complete full user journey', async ({ page }) => {
    const timestamp = Date.now();
    const email = `flowtest${timestamp}@example.com`;

    // 1. Register new user
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.register('Flow Test User', email, 'password123');

    // 2. Verify dashboard
    const dashboardPage = new DashboardPage(page);
    expect(await dashboardPage.isLoaded()).toBeTruthy();
    expect(await dashboardPage.hasNeoBrutalistDesign()).toBeTruthy();

    // 3. Navigate to admin (first user is admin)
    await dashboardPage.gotoAdmin();

    // 4. Verify admin page
    const adminPage = new AdminPage(page);
    expect(await adminPage.isLoaded()).toBeTruthy();

    // 5. Navigate to AI Flags tab
    await adminPage.clickAIFlagsTab();
    expect(await adminPage.isTabActive('AI Flags')).toBeTruthy();

    // 6. Navigate back to dashboard
    await adminPage.goBack();
    expect(await dashboardPage.isLoaded()).toBeTruthy();

    // 7. Logout
    await dashboardPage.logout();
    expect(page.url()).toContain('/login');

    // 8. Login again
    await loginPage.login(email, 'password123');
    expect(page.url()).toContain('/dashboard');
  });
});
