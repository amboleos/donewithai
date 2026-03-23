---
name: gen-test
description: Generate Vitest unit tests or Playwright E2E tests following project patterns
---

# Test Generator

Generate tests following the project's established patterns.

## Usage

```
/gen-test <file-path> [--e2e]
```

- `<file-path>`: Path to the source file to test
- `--e2e`: Generate Playwright E2E test instead of Vitest unit test

## Instructions

### For Unit Tests (Vitest)

1. Read the source file to understand what needs testing
2. Read existing tests in `tests/` to match patterns:
   - Import style: `import { describe, it, expect, vi } from "vitest"`
   - Mock patterns from `tests/lib/mock-*.ts`
   - Testing Library for React components
3. Generate test file at `tests/<path>/<name>.test.ts`
4. Include:
   - Edge cases and error conditions
   - Happy path scenarios
   - Mock external dependencies (DB, fetch, etc.)

### For E2E Tests (Playwright)

1. Read the source file/page to understand user flows
2. Read existing E2E tests in `e2e/` to match patterns:
   - Page objects from `e2e/pages/`
   - Test helpers from `e2e/utils/testHelpers.ts`
   - Setup from `e2e/setup.ts`
3. Generate test file at `e2e/<name>.spec.ts`
4. Include:
   - User authentication state
   - API mocking where appropriate
   - Visual assertions

## Existing Mocks

- `tests/lib/mock-db.ts` - Database mock
- `tests/lib/mock-git-provider.ts` - Git provider mock

## Example Output

```typescript
// tests/lib/example.test.ts
import { describe, it, expect, vi } from "vitest";
import { mockDb } from "./mock-db";

vi.mock("@/lib/db", () => ({ db: mockDb }));

describe("example", () => {
  it("should work", async () => {
    // test code
  });
});
```
