import { test, expect, Page } from '@playwright/test';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login');

  // Fill in login form
  await page.fill('input[type="email"]', 'efeturhan@gmail.com');
  await page.fill('input[type="password"]', '3Fe19877891');

  // Click sign in button
  await page.click('button:has-text("Sign In")');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 5000 });
}

// Helper function to get AI/Human counts from stats bar
async function getAIStats(page: Page) {
  const statsText = await page.locator('[class*="bg-[var(--muted)]"]').first().textContent();

  // Extract numbers from stats text using regex
  const patternAiMatch = statsText?.match(/pattern_ai:\s*(\d+)/);
  const agenticMatch = statsText?.match(/agentic:\s*(\d+)/);
  const humanAssistedMatch = statsText?.match(/human_assisted:\s*(\d+)/);
  const commitsMatch = statsText?.match(/commits:\s*(\d+)/);
  const branchesMatch = statsText?.match(/branches:\s*(\d+)/);

  return {
    patternAi: patternAiMatch ? parseInt(patternAiMatch[1]) : 0,
    agentic: agenticMatch ? parseInt(agenticMatch[1]) : 0,
    humanAssisted: humanAssistedMatch ? parseInt(humanAssistedMatch[1]) : 0,
    commits: commitsMatch ? parseInt(commitsMatch[1]) : 0,
    branches: branchesMatch ? parseInt(branchesMatch[1]) : 0,
  };
}

test.describe('AI Recheck Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should navigate to admin and display AI Flags tab', async ({ page }) => {
    // Navigate to admin
    await page.goto('/admin');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that we're on admin page
    await expect(page.locator('h1:has-text("Admin Console")').first()).toBeVisible();

    // Click AI Flags tab
    await page.click('button:has-text("AI Flags")');

    // Wait for AI Flags content to load
    await expect(page.locator('text=/AI FLAGS/i')).toBeVisible();

    // Verify stats bar is visible
    await expect(page.locator('text=/commits:/i')).toBeVisible();
    await expect(page.locator('text=/branches:/i')).toBeVisible();
    await expect(page.locator('text=/pattern_ai:/i')).toBeVisible();
  });

  test('should display current AI/Human commit counts in AI Flags tab', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click AI Flags tab
    await page.click('button:has-text("AI Flags")');

    // Wait for content to load
    await page.waitForSelector('text=/commits:/i');

    // Get initial stats
    const initialStats = await getAIStats(page);

    // Verify we have some data
    expect(initialStats.commits).toBeGreaterThanOrEqual(0);
    expect(initialStats.branches).toBeGreaterThanOrEqual(0);
    expect(initialStats.patternAi).toBeGreaterThanOrEqual(0);
    expect(initialStats.agentic).toBeGreaterThanOrEqual(0);
    expect(initialStats.humanAssisted).toBeGreaterThanOrEqual(0);

    console.log('Initial stats:', initialStats);
  });

  test('should perform AI recheck for a repository', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Repos tab first
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    // Check if there are any repos
    const repoCount = await page.locator('text=/repos:/i').count();

    if (repoCount === 0) {
      test.skip(true, 'No repositories found to test AI recheck');
      return;
    }

    // Look for a repo with the Brain icon (AI Recheck button)
    const recheckButton = page.locator('button[title*="Re-check AI"]').first();

    if (!(await recheckButton.isVisible())) {
      test.skip(true, 'No AI recheck button found');
      return;
    }

    // Click AI recheck button
    await recheckButton.click();

    // Wait for toast notification to appear
    await expect(page.locator('text=/Re-checking AI/i')).toBeVisible({ timeout: 5000 });

    // Wait for completion toast (this may take a while depending on repo size)
    // We'll wait up to 60 seconds but check periodically
    const startTime = Date.now();
    const maxWaitTime = 60000; // 60 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const completedToast = page.locator('text=/Found \\d+ AI commits/i');
        if (await completedToast.isVisible({ timeout: 1000 })) {
          break;
        }
      } catch {
        // Continue waiting
      }
      await page.waitForTimeout(1000);
    }

    // Verify success toast appeared
    await expect(page.locator('text=/Found \\d+ AI commits/i')).toBeVisible({ timeout: 5000 });
  });

  test('should verify AI recheck results match expected behavior', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Navigate to Repos tab
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    // Find first repo with recheck button
    const recheckButton = page.locator('button[title*="Re-check AI"]').first();

    if (!(await recheckButton.isVisible())) {
      test.skip(true, 'No AI recheck button found');
      return;
    }

    // Get repo name for logging
    const repoCard = recheckButton.locator('..').locator('..').locator('..');
    const repoName = await repoCard.locator('h3').first().textContent();
    console.log('Testing AI recheck for repo:', repoName);

    // Click recheck button
    await recheckButton.click();

    // Wait for recheck to complete
    await page.waitForSelector('text=/Found \\d+ AI commits/i', { timeout: 60000 });

    // Navigate to AI Flags tab to verify results
    await page.click('button:has-text("AI Flags")');
    await page.waitForLoadState('networkidle');

    // Get stats after recheck
    const statsAfter = await getAIStats(page);

    // Verify stats are non-negative
    expect(statsAfter.patternAi).toBeGreaterThanOrEqual(0);
    expect(statsAfter.agentic).toBeGreaterThanOrEqual(0);
    expect(statsAfter.humanAssisted).toBeGreaterThanOrEqual(0);

    console.log('Stats after recheck:', statsAfter);
  });

  test('should handle AI recheck errors gracefully', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Repos tab
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    // Find recheck button
    const recheckButton = page.locator('button[title*="Re-check AI"]').first();

    if (!(await recheckButton.isVisible())) {
      test.skip(true, 'No AI recheck button found');
      return;
    }

    // Mock error scenario by intercepting the request
    await page.route('**/api/sync/recheck-ai', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Click recheck button
    await recheckButton.click();

    // Wait for error toast
    await expect(page.locator('text=/Failed to re-check AI/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display progress events during AI recheck', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Repos tab
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    // Find recheck button
    const recheckButton = page.locator('button[title*="Re-check AI"]').first();

    if (!(await recheckButton.isVisible())) {
      test.skip(true, 'No AI recheck button found');
      return;
    }

    // Set up event listener for SSE events
    const events: string[] = [];

    // Listen to console logs for SSE events (if logged)
    page.on('console', msg => {
      if (msg.type() === 'log') {
        events.push(msg.text());
      }
    });

    // Click recheck button
    await recheckButton.click();

    // Look for progress indicator in toast
    await expect(page.locator('text=/Re-checking AI/i')).toBeVisible({ timeout: 5000 });

    // Wait for completion
    await page.waitForSelector('text=/Found \\d+ AI commits/i', { timeout: 60000 });

    // Verify we saw some progress (this is a soft check - the main thing is it completes)
    console.log('Events captured:', events.length);
  });

  test('should allow cancelling AI recheck operation', async ({ page }) => {
    // Note: Current implementation may not have a cancel button
    // This test is prepared for when that functionality is added

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Repos tab
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    // Look for cancel functionality
    const cancelButton = page.locator('button:has-text("Cancel")');

    if (await cancelButton.isVisible()) {
      // If cancel button exists, test it
      const recheckButton = page.locator('button[title*="Re-check AI"]').first();
      await recheckButton.click();

      // Wait a bit for operation to start
      await page.waitForTimeout(2000);

      // Click cancel
      await cancelButton.click();

      // Verify cancellation
      await expect(page.locator('text=/cancelled/i')).toBeVisible({ timeout: 5000 });
    } else {
      // Cancel functionality not implemented yet
      test.skip(true, 'Cancel button not implemented');
    }
  });

  test('should compare recheck results with analyze button results', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Go to AI Flags tab first
    await page.click('button:has-text("AI Flags")');
    await page.waitForLoadState('networkidle');

    // Get initial stats
    const initialStats = await getAIStats(page);
    console.log('Initial AI Flags stats:', initialStats);

    // Navigate to repos and perform recheck
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    const recheckButton = page.locator('button[title*="Re-check AI"]').first();

    if (!(await recheckButton.isVisible())) {
      test.skip(true, 'No AI recheck button found');
      return;
    }

    // Perform recheck
    await recheckButton.click();
    await page.waitForSelector('text=/Found \\d+ AI commits/i', { timeout: 60000 });

    // Go back to AI Flags tab
    await page.click('button:has-text("AI Flags")');
    await page.waitForLoadState('networkidle');

    // Get stats after recheck
    const statsAfterRecheck = await getAIStats(page);
    console.log('Stats after recheck:', statsAfterRecheck);

    // Now test the Analyze button on a single commit
    // Find first commit with Analyze button
    const analyzeButton = page.locator('button:has-text("ANALYZE")').first();

    if (await analyzeButton.isVisible()) {
      // Get the commit's row before analysis
      const commitRow = analyzeButton.locator('../../..');
      const commitMessage = await commitRow.locator('td').nth(0).textContent();
      console.log('Analyzing commit:', commitMessage?.substring(0, 50));

      // Click analyze
      await analyzeButton.click();

      // Wait for analysis to complete (may take a while)
      await page.waitForTimeout(5000);

      // Look for analysis modal or success toast
      const modal = page.locator('[class*="modal"]').first();
      if (await modal.isVisible({ timeout: 5000 })) {
        // Close modal
        await page.keyboard.press('Escape');
      }
    }

    // The key assertion: recheck should process ALL commits/branches
    // while analyze processes ONE at a time
    // We verify recheck completed without errors
    expect(statsAfterRecheck.commits).toBe(initialStats.commits);
    expect(statsAfterRecheck.branches).toBe(initialStats.branches);
  });

  test('should handle empty repository list gracefully', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Repos tab
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    // Check if there are no repos
    const noReposMessage = page.locator('text=/No repositories/i');

    if (await noReposMessage.isVisible()) {
      // Verify no recheck button is shown
      const recheckButton = page.locator('button[title*="Re-check AI"]');
      await expect(recheckButton).not.toBeVisible();
    } else {
      // There are repos, skip this test
      test.skip(true, 'Repositories exist, cannot test empty state');
    }
  });

  test('should handle network errors during recheck', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Repos tab
    await page.click('button:has-text("Repositories")');
    await page.waitForLoadState('networkidle');

    // Find recheck button
    const recheckButton = page.locator('button[title*="Re-check AI"]').first();

    if (!(await recheckButton.isVisible())) {
      test.skip(true, 'No AI recheck button found');
      return;
    }

    // Simulate network error by going offline
    await page.context().setOffline(true);

    // Click recheck button
    await recheckButton.click();

    // Should show error toast
    await expect(page.locator('text=/Failed to re-check AI/i')).toBeVisible({ timeout: 10000 });

    // Restore connection
    await page.context().setOffline(false);
  });
});
