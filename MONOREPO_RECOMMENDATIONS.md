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

### 5. **Conditional CI Execution**
- ✅ Mobile CI checks only run when `mobile/` files change
- ✅ Uses `dorny/paths-filter` to detect changed files
- ✅ Saves CI time and GitHub Actions minutes

## 🎯 Current Structure

```
personal_finance_app/
├── src/                    # Next.js web app
│   ├── app/
│   ├── components/
│   └── lib/
├── mobile/                 # React Native mobile app (completely independent)
│   ├── screens/
│   ├── lib/
│   ├── package.json       # Separate dependencies
│   ├── tsconfig.json      # Extends expo/tsconfig.base
│   └── .prettierrc        # Mobile-specific formatting
├── package.json           # Next.js dependencies
├── tsconfig.json          # Next.js TS config (excludes mobile)
└── eslint.config.mjs      # Next.js linting (excludes mobile)
```

## 📋 Recommendations

### 1. **CI/CD Pipeline** ✅ Already Implemented

The GitHub Actions workflow has been configured with:

```yaml
jobs:
  changes:
    # Detect which files changed
    outputs:
      mobile: ${{ steps.filter.outputs.mobile }}

  nextjs-type-check-and-build:
    # Always runs - checks Next.js code

  mobile-type-check:
    # Only runs when mobile/ files change
    needs: changes
    if: ${{ needs.changes.outputs.mobile == 'true' }}
```

**Benefits:**
- Mobile checks skip when only Next.js files change
- Saves CI time and GitHub Actions minutes
- Both projects validated independently

### 2. **Type Sharing Strategy**

**Current Approach: Independent Types** ✅ Recommended

Each project maintains its own types:

```
Next.js:  src/types/        # Web app types
Mobile:   mobile/lib/       # Mobile app types (defined inline)
```

**Why Independent Types:**
- ✅ Mobile app is truly standalone
- ✅ Can be moved to separate repo easily
- ✅ No coupling between projects
- ✅ Each defines what it needs from the API

**API Contract:**
- Both consume the same REST API (`GET /api/transactions`)
- API response structure is the source of truth
- Each project defines its own client types based on API

**Example:**
```typescript
// mobile/screens/TransactionsScreen.tsx
interface Transaction {
  id: string
  name: string
  amount_number: number
  // ... only what mobile needs
}
```

### 3. **Package Management: Keep Separate** ✅ Optimal

**Current Setup:**
- Each project has independent `package.json`
- Each manages its own dependencies
- No workspace configuration

**Why This Works:**
- ✅ Simple and clear separation
- ✅ No tooling overhead
- ✅ Each project can update deps independently
- ✅ Easy to understand for new developers

**Commands:**
```bash
# Web app
npm install                  # Install Next.js deps
npm run type-check          # Type check Next.js only

# Mobile app
cd mobile && npm install    # Install React Native deps
npm run type-check          # Type check mobile only
```

### 4. **Alternative Approaches (NOT Recommended)**

#### ❌ Option: pnpm Workspaces
- Adds complexity for minimal benefit
- Overkill for 2 independent projects
- Harder to extract mobile to separate repo later

#### ❌ Option: Turborepo
- Significant setup overhead
- Best for 5+ packages
- Not needed for simple web + mobile setup

### 5. **Lint/TypeScript Reuse**

#### ✅ Can Reuse:
- **Prettier config** - Both use similar formatting
  - Root uses `.prettierrc` (double quotes, 120 width)
  - Mobile uses `.prettierrc` (single quotes, 100 width)

#### ❌ Cannot Reuse:
- **ESLint config** - Different ecosystems
  - Next.js: `next/core-web-vitals`
  - React Native: Would use `@react-native-community/eslint-config`

- **TypeScript config** - Different targets
  - Next.js: `target: "ES2017"`, `jsx: "react-jsx"`
  - Expo: Extends `expo/tsconfig.base`

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
    'react-native/no-inline-styles': 'off',
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

### 7. **Pre-commit Hooks**

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

## 🎬 Summary

**Current Setup: ✅ Optimal for Your Use Case**

✅ **What You Have:**
- Two independent projects sharing a git repo
- Clean separation with proper exclusions
- Conditional CI that saves time
- Each project runs its own checks
- Simple and maintainable

✅ **What Works Well:**
- Mobile excluded from Next.js tooling
- Mobile has its own dependencies
- CI only runs mobile checks when needed
- No complex monorepo tools needed

✅ **Best Practices:**
- Keep projects independent
- Don't share types (API is the contract)
- Each project manages its own deps
- Run checks independently

**Don't** migrate to complex monorepo tools unless you add significantly more packages.

**Do** keep the current simple structure - it's perfect for web + mobile.

## 📝 Moving Mobile to Separate Repo (Future)

If you ever want to extract mobile to its own repo:

1. **Easy extraction** - Everything is in `mobile/`
2. **No dependencies** - Mobile doesn't import from Next.js
3. **Independent CI** - Already set up for separate checks
4. **Copy mobile folder** - That's it!

This setup makes the mobile app portable and truly standalone. 🚀
