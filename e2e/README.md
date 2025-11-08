# E2E Testing with Playwright

This directory contains end-to-end tests for the Personal Finance App using Playwright.

## Overview

The E2E tests verify basic read-only flows without mocking the database. Tests run against a real database (typically a test database) to ensure the entire application stack works correctly.

## Test Coverage

- **Pages Load**: Verify all pages load without errors and have proper SEO metadata
- **Dashboard**: Verify dashboard sections render correctly
- **Transactions**: Test transaction list, filtering, and sorting
- **Transaction Detail**: Test individual transaction pages
- **Modals**: Test add/edit transaction modals

## Setup

### Prerequisites

1. **Node.js**: Version 18 or higher
2. **Database**: A test PostgreSQL database with test data
3. **Environment Variables**: Configure for testing

### Installation

Playwright is already installed as a dev dependency. To install browsers:

```bash
npx playwright install
```

Or install specific browsers:

```bash
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

## Configuration

### Environment Variables

Create a `.env.test` file or set these environment variables for testing:

```bash
# Enable E2E test mode - REQUIRED for auth bypass
E2E_TEST_MODE=true

# Database connection (use a separate test database)
DATABASE_URL="postgresql://user:password@localhost:5432/finance_test"

# Allowed emails (for Better Auth)
ALLOWED_EMAILS="test@example.com"

# Other required env vars
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
PLAID_CLIENT_ID="your-test-plaid-client-id"
PLAID_SECRET="your-test-plaid-secret"
PLAID_ENV="sandbox"
```

### Authentication Bypass

The tests use a special authentication bypass mechanism that only works when `E2E_TEST_MODE=true`:

1. **Environment Variable**: Set `E2E_TEST_MODE=true` in your test environment
2. **HTTP Header**: Tests automatically send `x-e2e-bypass-auth: true` header
3. **Proxy Check**: `src/proxy.ts` validates both the env var and header before bypassing auth

**Security Note**: The auth bypass ONLY works when both conditions are met:
- `E2E_TEST_MODE=true` environment variable is set
- Request includes `x-e2e-bypass-auth: true` header

This ensures that auth bypass cannot be exploited in production.

## Running Tests

### Local Development

1. **Start the Next.js development server** (or build and start production):

```bash
# Development
npm run dev

# Or production build
npm run build
npm start
```

2. **Run all E2E tests** (in a separate terminal):

```bash
E2E_TEST_MODE=true npm run test:e2e
```

3. **Run tests in headed mode** (see the browser):

```bash
E2E_TEST_MODE=true npm run test:e2e:headed
```

4. **Run tests in UI mode** (interactive):

```bash
E2E_TEST_MODE=true npm run test:e2e:ui
```

5. **Run specific test file**:

```bash
E2E_TEST_MODE=true npx playwright test e2e/dashboard.spec.ts
```

6. **Run tests in a specific browser**:

```bash
E2E_TEST_MODE=true npx playwright test --project=chromium
E2E_TEST_MODE=true npx playwright test --project=firefox
E2E_TEST_MODE=true npx playwright test --project=webkit
```

### CI/CD

For CI/CD pipelines, set the environment variables and run:

```bash
E2E_TEST_MODE=true npx playwright test
```

Example GitHub Actions:

```yaml
- name: Run E2E tests
  env:
    E2E_TEST_MODE: true
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    BETTER_AUTH_SECRET: ${{ secrets.TEST_AUTH_SECRET }}
    # ... other env vars
  run: npm run test:e2e
```

## Test Database Setup

### Option 1: Separate Test Database

1. Create a separate PostgreSQL database for testing:

```bash
createdb finance_test
```

2. Run migrations on the test database:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/finance_test" npx prisma migrate deploy
```

3. Seed test data (create a seed script or manually add data)

### Option 2: Use Docker

```bash
# Start a test database with Docker
docker run --name finance-test-db \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=finance_test \
  -p 5433:5432 \
  -d postgres:15

# Run migrations
DATABASE_URL="postgresql://testuser:testpass@localhost:5433/finance_test" npx prisma migrate deploy
```

## Test Structure

```
e2e/
├── fixtures/
│   └── authenticated-page.ts    # Auth bypass fixture
├── utils/
│   └── test-helpers.ts          # Common test utilities
├── pages-load.spec.ts           # Page load and SEO tests
├── dashboard.spec.ts            # Dashboard tests
├── transactions.spec.ts         # Transaction list tests
├── transaction-detail.spec.ts   # Transaction detail tests
└── README.md                    # This file
```

### Test Fixtures

- **authenticated-page.ts**: Extends Playwright's base test with auth bypass headers

### Test Utilities

- **verifyMetadata()**: Check SEO metadata
- **waitForPageLoad()**: Wait for page to fully load
- **collectConsoleErrors()**: Track console errors
- **verifyElementVisible()**: Check element visibility

## Writing New Tests

1. Import the authenticated test fixture:

```typescript
import { test, expect } from './fixtures/authenticated-page';
import { waitForPageLoad } from './utils/test-helpers';
```

2. Write your test:

```typescript
test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('/my-page');
    await waitForPageLoad(page);

    // Your assertions
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

## Viewing Test Results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Debugging Tests

1. **Run in headed mode** to see the browser:

```bash
E2E_TEST_MODE=true npx playwright test --headed
```

2. **Run in debug mode** with Playwright Inspector:

```bash
E2E_TEST_MODE=true npx playwright test --debug
```

3. **Use VS Code extension**: Install "Playwright Test for VSCode" for integrated debugging

4. **Screenshots and traces**: Configured to capture on failure automatically

## Best Practices

1. **Use the authenticated fixture**: Always import from `./fixtures/authenticated-page`
2. **Wait for page loads**: Use `waitForPageLoad()` after navigation
3. **Use waitForTimeout sparingly**: Prefer waiting for specific elements
4. **Test data independence**: Tests should work regardless of database state
5. **Read-only tests**: Don't modify data that other tests depend on
6. **Descriptive test names**: Use clear, descriptive test names
7. **Group related tests**: Use `test.describe()` blocks

## Troubleshooting

### Tests fail with authentication errors

- Ensure `E2E_TEST_MODE=true` is set
- Check that `src/proxy.ts` has the auth bypass code
- Verify the fixture is setting the `x-e2e-bypass-auth` header

### Tests timeout

- Increase timeout in `playwright.config.ts`
- Check that the Next.js server is running
- Verify database connection

### Database has no data

- Seed test data into your test database
- Tests are designed to handle empty states gracefully

### Port conflicts

- Change the base URL in `playwright.config.ts` or set `PLAYWRIGHT_BASE_URL` env var
- Ensure Next.js is running on the expected port

## Configuration Files

- **playwright.config.ts**: Main Playwright configuration
- **e2e/fixtures/**: Test fixtures
- **e2e/utils/**: Test utilities

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
