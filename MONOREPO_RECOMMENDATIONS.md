# Monorepo Recommendations

This document provides recommendations for managing the Next.js web app and React Native mobile app in the same repository.

## ✅ What's Already Done

### 1. **Separation of Type Checking**
- ✅ `mobile/` excluded from Next.js `tsconfig.json`
- ✅ Mobile app has its own `tsconfig.json` extending Expo's config
- ✅ Fixed TypeScript errors in mobile app (removed unused React imports, added types)

### 2. **Separation of Linting**
- ✅ `mobile/` excluded from ESLint config (`eslint.config.mjs`)
- ✅ `mobile/` excluded from Prettier ignore (`.prettierignore`)

### 3. **Git Configuration**
- ✅ Mobile build artifacts added to `.gitignore`:
  - `mobile/node_modules/`
  - `mobile/.expo/`
  - `mobile/dist/`
  - `mobile/android/`
  - `mobile/ios/`

### 4. **Mobile App Tooling**
- ✅ Mobile has separate package.json with scripts:
  - `npm run type-check` - TypeScript type checking
  - `npm run format` - Prettier formatting
  - `npm run format:check` - Prettier check
- ✅ Mobile has its own `.prettierrc` config

## 🎯 Current Structure

```
personal_finance_app/
├── src/                    # Next.js web app
│   ├── app/
│   ├── components/
│   └── lib/
├── mobile/                 # React Native mobile app (separate project)
│   ├── screens/
│   ├── lib/
│   ├── package.json       # Separate dependencies
│   ├── tsconfig.json      # Extends expo/tsconfig.base
│   └── .prettierrc
├── shared-types/           # Shared TypeScript types
│   └── index.ts           # Transaction, Category, Tag types
├── package.json           # Next.js dependencies
├── tsconfig.json          # Next.js TS config (excludes mobile)
└── eslint.config.mjs      # Next.js linting (excludes mobile)
```

## 📋 Recommendations

### 1. **CI/CD Pipeline Updates**

Update your GitHub Actions workflow to handle both projects:

```yaml
name: CI

on: [push, pull_request]

jobs:
  nextjs-checks:
    name: Next.js Type Check & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run format:check
      - run: npm run build

  mobile-checks:
    name: React Native Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: cd mobile && npm ci
      - run: cd mobile && npm run type-check
      - run: cd mobile && npm run format:check
```

### 2. **Shared Types Usage**

Use the `shared-types/` folder for types used by both projects:

**In mobile app:**
```typescript
// mobile/lib/auth.ts
import type { Transaction, TransactionsResponse } from '../../shared-types'

export async function fetchTransactions(limit = 100) {
  const data: TransactionsResponse = await response.json()
  return { success: true, data: data.transactions }
}
```

**In Next.js app:**
```typescript
// src/lib/api-types.ts
export type { Transaction, Category, Tag } from '../shared-types'
```

### 3. **Package Management Options**

#### Option A: Keep Separate (Current - Recommended for Small Projects)
✅ Simple and clear separation
✅ No tooling overhead
✅ Each project manages its own deps
❌ No dependency deduplication

**Commands:**
```bash
# Web app
npm install                  # Install Next.js deps
npm run type-check          # Type check Next.js only

# Mobile app
cd mobile && npm install    # Install React Native deps
npm run type-check          # Type check mobile only
```

#### Option B: Migrate to pnpm Workspaces (Advanced)
✅ Shared dependencies
✅ Unified dependency management
✅ Better for larger teams
❌ More complex setup

**Setup:**
```bash
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'mobile'

# Restructure:
# packages/web/ (Next.js)
# packages/mobile/ (React Native)
# packages/shared-types/ (Shared types)
```

#### Option C: Migrate to Turborepo (Advanced)
✅ Optimized build caching
✅ Task orchestration
✅ Best for monorepos with many packages
❌ Significant setup overhead

**Not recommended unless** you plan to add more packages (e.g., admin panel, API package, etc.)

### 4. **Recommended: Keep Current Approach ✅**

For a 2-project monorepo (web + mobile), **the current structure is optimal**:

1. ✅ Each project has independent package.json
2. ✅ Clear separation with exclude patterns
3. ✅ Shared types via `shared-types/` folder
4. ✅ Independent CI checks
5. ✅ Simple to understand and maintain

### 5. **Lint/TypeScript Reuse Opportunities**

#### ✅ Can Reuse:
- **Prettier config** - Both use same formatting
  - Copy `.prettierrc` from root to `mobile/.prettierrc`
  - Already done with mobile-friendly adjustments (single quotes, shorter line width)

- **Shared Types** - See `shared-types/index.ts`
  - Transaction types
  - API response types
  - Category, Tag, Account types

#### ❌ Cannot Reuse:
- **ESLint config** - Different ecosystems
  - Next.js uses `next/core-web-vitals`
  - React Native would use `@react-native-community/eslint-config`

- **TypeScript config** - Different targets
  - Next.js: `target: "ES2017"`, `jsx: "react-jsx"`
  - Expo: Extends `expo/tsconfig.base` with React Native specifics

### 6. **Optional: Add Mobile Linting**

If you want ESLint for mobile:

```bash
cd mobile
npm install --save-dev @react-native-community/eslint-config eslint
```

Create `mobile/.eslintrc.js`:
```javascript
module.exports = {
  extends: '@react-native-community',
  rules: {
    'react-native/no-inline-styles': 'off', // Allow inline styles
  },
}
```

Add to `mobile/package.json`:
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

### 7. **GitHub Actions Example**

Update `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  web-app:
    name: Web App (Next.js)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Build
        run: npm run build

  mobile-app:
    name: Mobile App (React Native)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Format check
        run: npm run format:check
```

### 8. **Pre-commit Hooks**

Update `.husky/pre-commit` to check both projects:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check Next.js
npm run format:check
npm run type-check

# Check Mobile (if files changed in mobile/)
if git diff --cached --name-only | grep -q "^mobile/"; then
  echo "Mobile files changed, running mobile checks..."
  cd mobile
  npm run format:check
  npm run type-check
fi
```

## 🎬 Immediate Actions

1. ✅ **Already done** - Mobile excluded from Next.js type-check
2. ✅ **Already done** - Fixed TypeScript errors in mobile app
3. ✅ **Already done** - Added mobile formatting scripts

**Optional next steps:**
1. Update CI/CD pipeline (see example above)
2. Add mobile ESLint if desired
3. Set up pre-commit hooks for mobile
4. Start using shared-types/ for common types

## 📝 Summary

**Current Setup: ✅ Optimal for your use case**

- Two independent projects sharing a git repo
- Clean separation with proper exclusions
- Shared types available via `shared-types/`
- Each project runs its own checks
- Simple and maintainable

**Don't** migrate to complex monorepo tools (pnpm workspaces, Turborepo) unless you plan to add significantly more packages.

**Do** update your CI pipeline to run type-checks on both projects separately.
