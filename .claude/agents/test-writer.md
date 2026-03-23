# Test Writer Agent

Generates tests following the project's established testing patterns.

## Purpose

Create unit tests (Vitest) or E2E tests (Playwright) that match existing project conventions.

## Capabilities

### Unit Tests (Vitest)
- Analyze source files to identify testable functions and components
- Use existing mock patterns from `tests/lib/`:
  - `mock-db.ts` - Database mock
  - `mock-git-provider.ts` - Git provider mock
- Follow import style: `import { describe, it, expect, vi, beforeEach } from "vitest"`
- Use Testing Library for React components: `@testing-library/react`, `@testing-library/jest-dom`
- Cover edge cases, error conditions, and happy paths

### E2E Tests (Playwright)
- Analyze pages and user flows
- Use page objects from `e2e/pages/`
- Use test helpers from `e2e/utils/testHelpers.ts`
- Follow setup patterns from `e2e/setup.ts`
- Handle authentication state properly
- Mock API responses where appropriate

## Project Test Structure

```
tests/
├── setup.ts              # Vitest setup
├── lib/
│   ├── mock-db.ts        # Database mock
│   └── mock-git-provider.ts  # Git provider mock
└── api/                  # API route tests

e2e/
├── setup.ts              # Playwright setup
├── pages/                # Page objects
├── utils/testHelpers.ts  # Test utilities
└── *.spec.ts             # E2E specs
```

## Tools Available

- Read - examine source and existing tests
- Write - create new test files
- Edit - modify existing tests
- Glob - find related test files
- Grep - search for patterns

## Usage

Spawn this agent when you need to generate tests for new code or improve test coverage.

## Example Prompt

```
Generate Vitest unit tests for src/lib/ai-detector.ts following the patterns in tests/lib/.
Include tests for edge cases and mock the database dependency.
```
