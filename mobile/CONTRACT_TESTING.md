# API Contract Testing in CI

This document explains how to detect API contract breaks in your CI pipeline without running the full mobile app.

## The Problem

**Zod validation only runs at runtime**, so without additional testing:
- ❌ Contract breaks aren't caught in CI
- ❌ Broken deployments could reach production
- ❌ Users discover issues instead of CI

## The Solution: Multiple Options

### ⭐ **Option 1: Integration Tests** (Recommended - Implemented)

**What it does:** Runs tests that call the real API and validate responses against Zod schemas.

**Pros:**
- ✅ Catches contract breaks before deployment
- ✅ Tests real API behavior
- ✅ Same validation code as production app
- ✅ Easy to set up

**Cons:**
- ❌ Requires API to be running during tests
- ❌ Slower than static checks
- ❌ Needs test data in database

**Implementation:** Already done! See `lib/__tests__/api.test.ts`

**Run locally:**
```bash
cd mobile

# Install dependencies
npm install

# Set API URL for testing
export API_URL=http://localhost:3000

# Run contract tests
npm run test:contract
```

**Run in CI:**
1. Spin up Next.js API in test mode
2. Seed test data
3. Run `npm run test:contract`
4. Tear down

**Example CI setup (add to `.github/workflows/build.yml`):**
```yaml
mobile-contract-tests:
  name: Mobile App - Contract Tests
  runs-on: ubuntu-latest
  needs: nextjs-type-check-and-build

  steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'

    # Start Next.js API in background
    - name: Install Next.js dependencies
      run: npm ci

    - name: Start Next.js API
      run: npm run start &
      env:
        DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

    - name: Wait for API to be ready
      run: npx wait-on http://localhost:3000/api/health

    # Run mobile contract tests
    - name: Install Mobile dependencies
      working-directory: mobile
      run: npm ci

    - name: Run Contract Tests
      working-directory: mobile
      run: npm run test:contract
      env:
        API_URL: http://localhost:3000
```

---

### 🚀 **Option 2: Shared Zod Schemas** (Static Validation)

**What it does:** Both Next.js and mobile import from the same Zod schema files.

**Pros:**
- ✅ Compile-time errors if schemas change
- ✅ No runtime required
- ✅ Single source of truth
- ✅ Fast CI checks

**Cons:**
- ❌ Adds coupling between projects
- ❌ Mobile depends on Next.js schema files
- ❌ Harder to deploy independently

**Implementation:**

1. **Move schemas to shared location:**
```
personal_finance_app/
├── schemas/                    # Shared Zod schemas
│   ├── transaction.ts
│   ├── account.ts
│   └── category.ts
├── mobile/
│   └── lib/api.ts             # Imports from ../../schemas
└── src/
    ├── types/api.ts           # Imports from ../../schemas
    └── app/api/
```

2. **Next.js validates requests using shared schemas:**
```typescript
// src/app/api/transactions/route.ts
import { transactionResponseSchema } from '../../../schemas/transaction'

export async function GET() {
  const transactions = await prisma.transaction.findMany(...)

  // Validate before returning (ensures contract is met)
  return NextResponse.json(
    transactionResponseSchema.parse({ transactions, count: transactions.length })
  )
}
```

3. **Mobile validates responses using same schemas:**
```typescript
// mobile/lib/api.ts
import { transactionResponseSchema } from '../../schemas/transaction'

export async function fetchTransactions() {
  const response = await fetch(...)
  const json = await response.json()
  return transactionResponseSchema.parse(json) // Same schema!
}
```

4. **CI automatically catches breaks:**
   - TypeScript fails if Next.js changes schema
   - Mobile fails type-check if it uses changed fields
   - No runtime tests needed!

---

### 📄 **Option 3: OpenAPI Contract Testing**

**What it does:** Generate OpenAPI spec from Next.js, validate mobile requests/responses match.

**Pros:**
- ✅ Industry standard
- ✅ Auto-generate docs
- ✅ Tool ecosystem (Swagger UI, etc.)
- ✅ Language-agnostic

**Cons:**
- ❌ More setup complexity
- ❌ Another layer to maintain
- ❌ May not catch all Zod validations

**Tools:**
- **@anatine/zod-openapi** - Generate OpenAPI from Zod schemas
- **openapi-typescript** - Generate TypeScript from OpenAPI
- **jest-openapi** - Validate responses against spec

**Implementation (high-level):**

1. Generate OpenAPI spec from Next.js Zod schemas
2. Commit spec to repo (`api-spec.yaml`)
3. CI checks if spec changed (breaks contract)
4. Mobile generates types from spec

---

### 🔄 **Option 4: Pact Contract Testing**

**What it does:** Consumer-driven contract testing - mobile defines expected API responses.

**Pros:**
- ✅ Consumer-driven (mobile defines contract)
- ✅ Catches changes before deployment
- ✅ Good for microservices

**Cons:**
- ❌ Complex setup
- ❌ Requires Pact broker
- ❌ Overkill for single-repo monolith

**Tools:**
- **@pact-foundation/pact** - Pact testing library

---

### 🧪 **Option 5: Snapshot Testing**

**What it does:** Store API response snapshots, fail if they change.

**Pros:**
- ✅ Easy to set up
- ✅ Catches any response change
- ✅ Works with existing tests

**Cons:**
- ❌ Noisy (fails on any change, even safe ones)
- ❌ Requires manual review of diffs
- ❌ Large snapshot files

**Implementation:**
```typescript
// lib/__tests__/api.test.ts
it('should match API response snapshot', async () => {
  const result = await fetchTransactions(1)
  expect(result.data).toMatchSnapshot()
})
```

---

## Recommendation: Hybrid Approach

**For your project, I recommend:**

### Phase 1: Start Simple (Current)
1. ✅ **Option 1: Integration Tests** (already implemented)
2. Run tests manually before deploying
3. Add to CI when test environment is ready

### Phase 2: Add Static Checks (Future)
When mobile grows (10+ screens):
1. Consider **Option 2: Shared Schemas**
2. Migrate schemas to shared folder
3. Get compile-time guarantees

### Phase 3: Advanced (If Needed)
If you add more clients (Android native, iOS native, web):
1. Consider **Option 3: OpenAPI**
2. Generate clients from spec
3. Centralized documentation

---

## Quick Start: Enable Contract Tests in CI

### Prerequisites
1. Test database with sample data
2. Next.js running in test mode
3. Health check endpoint

### Steps

1. **Add health check endpoint** (`src/app/api/health/route.ts`):
```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

2. **Update `.github/workflows/build.yml`:**
   - Uncomment the contract test step (line 109-112)
   - Add `TEST_API_URL` secret to GitHub
   - Or use the full example above to spin up API in CI

3. **Configure test environment:**
```bash
# GitHub repository secrets
TEST_API_URL=https://your-test-api.vercel.app
TEST_DATABASE_URL=postgresql://...
```

4. **Run tests:**
```bash
npm run test:contract
```

---

## Current Status

✅ **Implemented:**
- Integration tests in `lib/__tests__/api.test.ts`
- Test scripts in `package.json`
- Jest configuration in `jest.config.js`
- CI workflow prepared (commented out)

⏳ **Next Steps:**
1. Install test dependencies: `cd mobile && npm install`
2. Configure test API URL
3. Run tests locally to verify
4. Uncomment CI step when ready

---

## Files Reference

- **Tests:** `mobile/lib/__tests__/api.test.ts`
- **Schemas:** `mobile/lib/schemas/transaction.ts`
- **CI Config:** `.github/workflows/build.yml:109-112`
- **Jest Config:** `mobile/jest.config.js`
- **Test Scripts:** `mobile/package.json:13-14`

---

## FAQ

**Q: Do I need a separate test environment?**
A: Not required for local testing, but recommended for CI to avoid affecting production data.

**Q: How often should contract tests run?**
A: On every PR that changes API or mobile code. Use path filters to skip when unrelated files change.

**Q: What if the API is slow?**
A: Mock the API in most tests, use real API only for critical contract tests.

**Q: Can I test against production API?**
A: Possible but not recommended - use a staging/test environment to avoid rate limits and data pollution.

**Q: What about authentication in tests?**
A: Create a test user account or mock auth in test environment.
