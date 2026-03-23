# E2E Tests with Playwright

This directory contains end-to-end tests for the DoneWithAI application using Playwright.

## Test Structure

```
e2e/
├── pages/              # Page Object Model classes
│   ├── BasePage.ts     # Base page with common functionality
│   ├── LoginPage.ts    # Login page object
│   ├── DashboardPage.ts # Dashboard page object
│   └── AdminPage.ts    # Admin page object
├── utils/              # Test utilities and helpers
│   └── testHelpers.ts  # Helper functions for testing
├── spec.ts             # Main test file
└── README.md           # This file
```

## Page Object Model

The tests use the Page Object Model (POM) pattern for better maintainability:

- **BasePage**: Contains common functionality shared across all pages
- **LoginPage**: Handles authentication operations
- **DashboardPage**: Handles dashboard interactions
- **AdminPage**: Handles admin panel operations

## Test Coverage

### 1. Authentication Flow
- ✓ Login page displays with Neo-Brutalist styling
- ✓ Switch between Sign In and Sign Up tabs
- ✓ Validation errors for invalid credentials
- ✓ Validation errors for short password
- ✓ User registration
- ✓ User login

### 2. Dashboard Page
- ✓ Dashboard displays with Neo-Brutalist styling
- ✓ User information display
- ✓ Stats cards display
- ✓ Empty state when no repos
- ✓ Repository list display
- ✓ Admin button visibility
- ✓ Logout functionality
- ✓ Navigation to admin
- ✓ Theme toggle

### 3. Repository Operations
- ✓ Open add repository dialog
- ✓ Add new repository
- ✓ Sync repository
- ✓ Delete repository

### 4. Admin AI Flags Tab
- ✓ Admin page displays with Neo-Brutalist styling
- ✓ Navigate to AI Flags tab
- ✓ Display stats bar
- ✓ Display commits table
- ✓ Switch to branches table
- ✓ Search commits
- ✓ Filter by AI status (all, ai, human, unknown)
- ✓ Filter by code analysis status (all, agentic, human assisted, not analyzed)
- ✓ Sort by date
- ✓ Sort by status
- ✓ Display badges correctly
- ✓ Toggle AI flag for commit
- ✓ Navigate between tabs
- ✓ Go back to dashboard
- ✓ Display stats

### 5. Full User Flow
- ✓ Complete user journey (register → dashboard → admin → logout → login)

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run E2E tests in UI mode
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test e2e/spec.ts
```

### Run specific test suite
```bash
npx playwright test -g "Authentication Flow"
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### Run tests with trace viewer
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## Test Configuration

Playwright configuration is in `playwright.config.ts`:

- **Test directory**: `./e2e`
- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium (Desktop Chrome)
- **Timeout**: Default (30s)
- **Retries**: 0 locally, 2 in CI
- **Screenshots**: On failure only
- **Traces**: On first retry

## Writing New Tests

### 1. Create Page Object (if needed)

Add a new page object in `e2e/pages/`:

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
  readonly url: string;
  readonly someElement: Locator;

  constructor(page: Page) {
    super(page);
    this.url = '/my-page';
    this.someElement = page.locator('button');
  }

  async goto() {
    await super.goto(this.url);
    await this.waitForStable();
  }

  async doSomething() {
    await this.someElement.click();
  }
}
```

### 2. Add Test Case

Add tests in `e2e/spec.ts`:

```typescript
test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.goto();

    // Test logic
    await expect(myPage.someElement).toBeVisible();
  });
});
```

### 3. Use Helper Functions

Import from `e2e/utils/testHelpers.ts`:

```typescript
import { TestDataGenerator, AuthHelpers, WaitHelpers } from '../utils/testHelpers';

test('my test', async ({ page }) => {
  const email = TestDataGenerator.randomEmail();
  await AuthHelpers.register(page, 'Test User', email);
  await WaitHelpers.waitForLoading(page);
});
```

## Test Data

Tests use generated test data to avoid conflicts:

- **Emails**: Generated with timestamp and random string
- **Usernames**: Generated with timestamp
- **Repo URLs**: Generated with random suffix
- **Commit messages**: Selected from predefined list

## Debugging Tips

### 1. Run in UI mode
```bash
npm run test:e2e:ui
```

### 2. Use debug mode
```bash
npx playwright test --debug
```

### 3. Take screenshots
```typescript
import { ScreenshotHelpers } from '../utils/testHelpers';

test('my test', async ({ page }) => {
  // Test code
  await ScreenshotHelpers.onFailure(page, 'my-test');
});
```

### 4. View traces
After test run, view trace:
```bash
npx playwright show-trace test-results/trace.zip
```

### 5. Inspector mode
Run tests with inspector to step through:
```bash
npx playwright test --debug
```

## Best Practices

1. **Use Page Objects**: Always use page objects, don't interact with page directly
2. **Wait for Stability**: Use `waitForStable()` after navigation
3. **Explicit Waits**: Use explicit waits over implicit timeouts
4. **Reusable Helpers**: Use helper functions for common operations
5. **Descriptive Tests**: Use clear test names that describe what's being tested
6. **Independent Tests**: Each test should be independent and runnable in isolation
7. **Clean Up**: Clean up test data after tests if needed
8. **Assertions**: Use specific assertions with clear messages

## Troubleshooting

### Tests fail with "timeout"
- Increase timeout in test: `test.setTimeout(60000)`
- Check if dev server is running
- Verify network connection

### Tests fail with "element not found"
- Verify selectors are correct
- Check if element is dynamically loaded
- Add explicit wait for element

### Tests fail in CI but pass locally
- Check CI environment configuration
- Verify base URL is correct
- Check for timing issues
- Review CI logs for specific errors

### Slow tests
- Use `test.step()` to organize and speed up
- Reduce unnecessary waits
- Use `test.describe.serial()` only when needed
- Run tests in parallel (default)

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries on failure
- 1 worker (no parallelism)
- HTML reporter
- Screenshots on failure
- Traces on retry

## Maintenance

- Update page objects when UI changes
- Add new tests for new features
- Keep test data generators updated
- Review and update flaky tests
- Regular test run reports

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
