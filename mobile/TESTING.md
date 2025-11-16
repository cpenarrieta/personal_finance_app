# Running Contract Tests Locally

This guide shows you how to run API contract tests on your local machine.

## Quick Start

### Option 1: Simple npm Command (Recommended)

```bash
cd mobile

# Test against local Next.js server (default: localhost:3000)
npm run test:contract:local

# Or just run the test (uses API_URL from config.ts)
npm run test:contract:dev
```

### Option 2: Custom API URL

```bash
cd mobile

# Test against custom URL
API_URL=http://192.168.1.100:3000 npm run test:contract

# Test against staging/production
API_URL=https://your-app.vercel.app npm run test:contract
```

### Option 3: Bash Script (Unix/Mac/Linux)

```bash
cd mobile

# Run with interactive checks
./scripts/test-contract.sh

# With custom API URL
API_URL=http://localhost:3000 ./scripts/test-contract.sh
```

---

## Prerequisites

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Start Your API Server

The contract tests need a running API to test against.

**For local development:**
```bash
# In a separate terminal, from project root
npm run dev
```

Your Next.js server should be running at `http://localhost:3000`

**For testing against remote API:**
- No local server needed
- Just set `API_URL` to your staging/production URL

---

## Available Test Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Basic** | `npm run test:contract` | Run contract tests (uses API_URL from config.ts) |
| **Local** | `npm run test:contract:local` | Test against localhost:3000 |
| **Dev** | `npm run test:contract:dev` | Same as basic (for consistency) |
| **All Tests** | `npm test` | Run all Jest tests (currently just contract tests) |

---

## Examples

### Test Against Local Server

```bash
# Terminal 1: Start Next.js API
cd /path/to/personal_finance_app
npm run dev

# Terminal 2: Run contract tests
cd mobile
npm run test:contract:local
```

**Expected output:**
```
 PASS  lib/__tests__/api.test.ts
  API Contract Tests
    GET /api/transactions
      ✓ should return valid transaction data (245ms)
      ✓ should have required fields in correct format (12ms)
      ✓ should handle validation errors gracefully (8ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### Test Against Different URL

```bash
cd mobile

# Local network (use your computer's IP)
API_URL=http://192.168.1.100:3000 npm run test:contract

# Staging environment
API_URL=https://staging.your-app.com npm run test:contract

# Production (be careful!)
API_URL=https://your-app.vercel.app npm run test:contract
```

### Windows (PowerShell)

```powershell
cd mobile

# Set environment variable then run tests
$env:API_URL="http://localhost:3000"
npm run test:contract
```

### Windows (CMD)

```cmd
cd mobile

set API_URL=http://localhost:3000
npm run test:contract
```

---

## What Gets Tested

The contract tests validate:

✅ **API Response Structure**
- Transactions array is present
- Each transaction has required fields
- Field types match expectations (string, number, boolean, etc.)

✅ **Schema Validation**
- Response validates against Zod schemas
- Nested objects (category, account, tags) have correct structure
- Nullable fields are handled properly

✅ **Error Handling**
- API errors are caught and returned properly
- Validation errors provide helpful messages

---

## Troubleshooting

### ❌ "Cannot reach API"

**Problem:** Tests fail with connection error

**Solutions:**
1. Make sure Next.js server is running: `npm run dev`
2. Check the API URL is correct
3. If using IP address, make sure device is on same network
4. Try: `curl http://localhost:3000/api/health`

### ❌ "Invalid API response format"

**Problem:** Response doesn't match schema

**This is actually good!** It means you found a contract break:
1. Check what changed in the API response
2. Update the Zod schema in `lib/schemas/transaction.ts` if the change was intentional
3. Update screens using the changed types

**Example error:**
```
Invalid API response format
validationError: {
  transactions: {
    0: {
      amount_number: { _errors: ['Expected number, received string'] }
    }
  }
}
```

This tells you exactly what's wrong: `amount_number` should be a number but API returned a string.

### ❌ "Authentication failed"

**Problem:** API requires authentication

**Solution:**
The mobile app uses OAuth (Google/GitHub) for authentication. For contract tests:

1. **Option A:** Use a test endpoint that doesn't require auth (create `/api/test/transactions`)
2. **Option B:** Mock authentication in test environment
3. **Option C:** Set up test user credentials in your test config

### ❌ Tests pass locally but fail in CI

**Problem:** Environment differences

**Check:**
1. Is `TEST_API_URL` secret configured in GitHub?
2. Is the test API reachable from CI runners?
3. Do you need to seed test data?

---

## Advanced: Watch Mode

Run tests in watch mode (re-runs on file changes):

```bash
cd mobile

# Watch mode
npm run test:contract -- --watch

# Watch mode with verbose output
npm run test:contract -- --watch --verbose
```

---

## Advanced: Add Health Check Endpoint

For better test reliability, add a health check endpoint to your Next.js API:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
}
```

Then check before running tests:
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":"2025-11-16T..."}
```

---

## Integration with Development Workflow

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
cd mobile && npm run test:contract:local
```

### VS Code Task

Add to `.vscode/tasks.json`:
```json
{
  "label": "Test Mobile Contracts",
  "type": "shell",
  "command": "cd mobile && npm run test:contract:local",
  "problemMatcher": [],
  "presentation": {
    "reveal": "always",
    "panel": "new"
  }
}
```

---

## Summary

**Simplest way to run tests:**
```bash
cd mobile
npm run test:contract:local  # Make sure Next.js is running first!
```

**With custom URL:**
```bash
API_URL=http://your-server:3000 npm run test:contract
```

**Using the script:**
```bash
cd mobile
./scripts/test-contract.sh
```

For more details on contract testing strategies, see `CONTRACT_TESTING.md`.
