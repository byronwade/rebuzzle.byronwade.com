# Testing Guide

This document describes the testing setup and strategy for Rebuzzle.

## Test Setup

### Prerequisites

Install testing dependencies:

```bash
npm install --save-dev jest @types/jest ts-jest @jest/globals
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are located alongside source files in `__tests__` directories:

```
src/
  lib/
    __tests__/
      env.test.ts
    env.ts
```

## Test Categories

### Unit Tests

Test individual functions and utilities in isolation.

**Example:** `src/lib/__tests__/env.test.ts`

Tests:
- Environment variable validation
- Configuration parsing
- Error handling

### Integration Tests

Test API routes and database operations.

**To Add:**
- API route tests
- Database operation tests
- Authentication flow tests

### E2E Tests

Test complete user flows.

**To Add:**
- User registration and login
- Puzzle solving flow
- Notification subscription

## Writing Tests

### Example Unit Test

```typescript
import { describe, it, expect } from "@jest/globals";
import { validateEnv } from "../env";

describe("validateEnv", () => {
  it("should validate required environment variables", () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    const result = validateEnv();
    expect(result.valid).toBe(true);
  });
});
```

### Example API Route Test

```typescript
import { describe, it, expect } from "@jest/globals";
import { GET } from "../api/health/route";

describe("GET /api/health", () => {
  it("should return healthy status", async () => {
    const response = await GET();
    const data = await response.json();
    expect(data.status).toBe("healthy");
  });
});
```

## Test Coverage Goals

- **Critical paths**: 80%+ coverage
- **Utilities**: 70%+ coverage
- **API routes**: 60%+ coverage
- **Overall**: 50%+ coverage

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Mocking

### Database

Mock MongoDB operations:

```typescript
jest.mock("@/db/mongodb", () => ({
  getCollection: jest.fn(),
  checkDatabaseHealth: jest.fn(),
}));
```

### External APIs

Mock external API calls:

```typescript
jest.mock("@/ai/client", () => ({
  generateRebusPuzzle: jest.fn(),
}));
```

## Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Keep tests isolated**
4. **Mock external dependencies**
5. **Test error cases**
6. **Test edge cases**
7. **Keep tests fast**
8. **Maintain test coverage**

## Future Improvements

- [ ] Add Playwright for E2E tests
- [ ] Add API route integration tests
- [ ] Add database operation tests
- [ ] Add authentication flow tests
- [ ] Set up CI/CD with test automation
- [ ] Add visual regression tests
- [ ] Add performance tests


