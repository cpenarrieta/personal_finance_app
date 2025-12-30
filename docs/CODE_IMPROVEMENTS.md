# Code Organization & Readability Improvements

This document outlines recommended refactoring improvements for the personal finance app, organized by priority.

---

## Executive Summary

After thorough analysis of the codebase, I've identified **23 improvement opportunities** across 4 categories:

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Component Organization | 2 | 3 | 2 | 1 |
| Library/Utilities | 2 | 2 | 3 | 1 |
| API Routes & Actions | 3 | 2 | 2 | 0 |
| Type Safety & Patterns | 1 | 1 | 1 | 0 |

---

## Critical Priority

### 1. Split Large Monolithic Components

**Problem**: Several components exceed 800+ lines, making them hard to maintain and test.

| File | Lines | Issue |
|------|-------|-------|
| `src/components/transactions/analytics/ChartsView.tsx` | 980 | 5 chart tabs + filter logic in one file |
| `src/components/transactions/analytics/TransactionAnalytics.tsx` | 833 | Duplicate filter logic with ChartsView |
| `src/components/transactions/list/SearchableTransactionList.tsx` | 854 | Search, filters, summary, bulk ops, table combined |

**Solution**: Extract focused sub-components:

```
components/transactions/analytics/
├── ChartsView.tsx              # Orchestrator only (~150 lines)
├── charts/
│   ├── SubcategoryChartTab.tsx
│   ├── MonthlyComparisonTab.tsx
│   ├── SpendingTrendsTab.tsx
│   ├── IncomeVsExpensesTab.tsx
│   └── CategoryBreakdownTab.tsx
└── filters/
    └── ChartFiltersPanel.tsx
```

**Files to modify**:
- `src/components/transactions/analytics/ChartsView.tsx`
- `src/components/transactions/analytics/TransactionAnalytics.tsx`
- `src/components/transactions/list/SearchableTransactionList.tsx`

---

### 2. Consolidate Duplicate Chart Directories

**Problem**: Chart components are split across two directories with unclear separation.

```
src/components/
├── charts/                    # Base chart components
│   ├── CashflowSankeyChart.tsx
│   ├── DailySpendingChart.tsx
│   └── SpendingByCategoryChart.tsx
└── dashboard/charts/          # Async wrappers
    ├── CashflowSankeyChartAsync.tsx
    ├── DailySpendingChartAsync.tsx
    └── SpendingByCategoryChartAsync.tsx
```

**Solution**: Consolidate with clear naming:

```
src/components/charts/
├── CashflowSankeyChart.tsx
├── CashflowSankeyChart.async.tsx
├── CashflowSankeyChart.skeleton.tsx
├── DailySpendingChart.tsx
├── DailySpendingChart.async.tsx
└── index.ts                   # Re-export async versions as default
```

---

### 3. Extract Server Actions from Components

**Problem**: Server actions are embedded inside component files without validation.

**Files affected**:
- `src/components/settings/ManageCategoriesAsync.tsx` (lines 21-78)
- `src/components/settings/ManageTagsAsync.tsx` (lines 13-45)

**Current pattern** (problematic):
```typescript
// Inside component file
async function createCategory(formData: FormData) {
  "use server"
  const name = formData.get("name") as string  // No validation!
  await prisma.category.create({ data: { name } })
}
```

**Solution**: Create dedicated action files with validation:

```typescript
// src/app/(app)/settings/manage-categories/actions.ts
import { z } from "zod"

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  imageUrl: z.string().url().optional(),
  isTransferCategory: z.boolean().default(false),
})

export async function createCategory(formData: FormData) {
  "use server"
  const parsed = CreateCategorySchema.safeParse({
    name: formData.get("name"),
    imageUrl: formData.get("imageUrl"),
    isTransferCategory: formData.get("isTransferCategory") === "true",
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  await prisma.category.create({ data: parsed.data })
  revalidateTag("categories")
}
```

---

## High Priority

### 4. Standardize Error Handling in API Routes

**Problem**: Error responses vary wildly across routes.

| Route | Error Format |
|-------|--------------|
| `/api/transactions` | `{ error: string }` |
| `/api/transactions/bulk-update` | `{ success: false, error: string }` |
| `/api/plaid/sync-transactions` | `{ ok: false, error, errorCode }` |
| `/api/plaid/webhook` | `{ received: true, error }` |

**Solution**: Create standardized error handler:

```typescript
// src/lib/api/response.ts
export function apiError(message: string, status = 500, code?: string) {
  return NextResponse.json(
    { success: false, error: message, code },
    { status }
  )
}

export function apiSuccess<T>(data: T) {
  return NextResponse.json({ success: true, data })
}
```

**Files to update**: All 25 API routes in `src/app/api/`

---

### 5. Complete Query File Organization

**Problem**: Query files are inconsistently split with no clear pattern.

**Current state**:
- `queries.ts` (709 lines) - transactions, accounts, categories, tags, holdings, investments
- `queries-transactions.ts` (125 lines) - only `getTransactionById`
- `queries-settings.ts` (74 lines) - management queries

**Solution**: Split by domain:

```
src/lib/db/
├── queries/
│   ├── index.ts                    # Re-exports all
│   ├── transactions.ts             # All transaction queries
│   ├── accounts.ts                 # All account queries
│   ├── categories.ts               # All category queries
│   ├── tags.ts                     # All tag queries
│   ├── investments.ts              # Holdings, securities, investment transactions
│   └── settings.ts                 # Management-specific queries
└── prisma.ts
```

---

### 6. Extract Shared Transaction Select Statement

**Problem**: The 65+ line transaction select object is repeated in 3+ queries.

**Files affected**:
- `src/lib/db/queries.ts:24-89` (getAllTransactions)
- `src/lib/db/queries.ts:401-467` (getTransactionsForAccount)
- `src/lib/db/queries-transactions.ts:20-124` (getTransactionById)

**Solution**: Create shared select constant:

```typescript
// src/lib/db/selects.ts
export const TRANSACTION_SELECT = {
  id: true,
  plaidTransactionId: true,
  accountId: true,
  amount_number: true,
  // ... all 30+ fields
  account: { select: ACCOUNT_SELECT_MINIMAL },
  category: { select: CATEGORY_SELECT },
  subcategory: { select: SUBCATEGORY_SELECT },
  tags: { select: TAG_SELECT },
} as const
```

---

### 7. Fix Duplicate Transaction Split Logic

**Problem**: Nearly identical split logic in two routes.

**Files**:
- `src/app/api/transactions/[id]/split/route.ts` (lines 77-122)
- `src/app/api/transactions/[id]/ai-split/route.ts` (lines 85-155)

**Solution**: Extract to service:

```typescript
// src/lib/transactions/split-service.ts
export async function splitTransaction(
  originalId: string,
  splits: SplitItem[],
  options?: { applyTagsToChildren?: boolean }
) {
  return prisma.$transaction(async (tx) => {
    // Shared validation and creation logic
  })
}
```

---

### 8. Remove Hardcoded Colors from ChartsView

**Problem**: Hardcoded hex colors in chart components violate theming guidelines.

**File**: `src/components/transactions/analytics/ChartsView.tsx:48-59`

```typescript
const COLORS = [
  "#3b82f6",  // Should use CSS variables
  "#10b981",
  // ...
]
```

**Solution**: Use theme variables per THEMING.md:

```typescript
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  // ...
]
```

Also affects: `src/lib/dashboard/calculations.ts:123-139`

---

## Medium Priority

### 9. Split sync-service.ts

**Problem**: `src/lib/sync/sync-service.ts` is 852 lines with 7 major functions doing very different things.

**Solution**: Modularize:

```
src/lib/sync/
├── sync-service.ts           # Main orchestrator (~200 lines)
├── transaction-sync.ts       # Transaction-specific sync
├── investment-sync.ts        # Investment-specific sync
├── builders/
│   ├── transaction-builder.ts
│   ├── account-builder.ts
│   ├── holding-builder.ts
│   └── security-builder.ts
└── index.ts
```

---

### 10. Create Constants File

**Problem**: Magic numbers and hardcoded strings scattered across files.

**Examples**:
- `HISTORICAL_START_DATE = "2024-01-01"` (sync-service.ts:14)
- `TRANSACTION_BATCH_SIZE = 500` (sync-service.ts:15)
- `12000` ms delay (sync-service.ts:47) - no comment
- Hardcoded color values (calculations.ts:123-139)

**Solution**: Centralize configuration:

```typescript
// src/lib/constants.ts
export const SYNC_CONFIG = {
  HISTORICAL_START_DATE: "2024-01-01",
  TRANSACTION_BATCH_SIZE: 500,
  API_RATE_LIMIT_DELAY_MS: 12000,
} as const

export const CHART_COLORS = {
  DEFAULT: ["var(--chart-1)", "var(--chart-2)", /* ... */],
  SANKEY: {
    income: "hsl(var(--success))",
    expense: "hsl(var(--destructive))",
    surplus: "hsl(var(--success))",
  },
} as const
```

---

### 11. Add Validation to Plaid API Routes

**Problem**: Several Plaid routes lack input validation.

**Files**:
- `src/app/api/plaid/exchange-public-token/route.ts:10` - No try-catch
- `src/app/api/plaid/create-link-token/route.ts:9-10` - Silent fail on parse error

**Solution**: Add consistent validation:

```typescript
const body = await safeParseRequestBody(req, ExchangeTokenSchema)
if (!body.success) {
  return apiError("Invalid request body", 400)
}
```

---

### 12. Standardize Async/Client/Skeleton Pattern

**Problem**: Inconsistent naming across components.

| Component | Pattern |
|-----------|---------|
| CategoryOrder | `Async` + `Client` + `Skeleton` ✓ |
| ManageCategories | `Async` + `Skeleton` (missing Client) |
| Dashboard charts | `Async` only (missing Skeleton) |

**Solution**: Document and enforce pattern:

```
ComponentName/
├── ComponentName.tsx          # Client component
├── ComponentName.async.tsx    # Server wrapper with data fetching
├── ComponentName.skeleton.tsx # Loading state
└── index.ts                   # Exports async version as default
```

---

### 13. Fix Naming Inconsistency in Hooks

**Problem**: `src/hooks/use-mobile.ts` uses kebab-case while all others use camelCase.

**Files**:
- `use-mobile.ts` → Rename to `useMobile.ts`

Update imports in:
- Any component using `use-mobile`

---

### 14. Refactor Long Webhook Route

**Problem**: `src/app/api/plaid/webhook/route.ts` is 283 lines handling multiple webhook types.

**Solution**: Extract handlers:

```typescript
// src/lib/plaid/webhook-handlers.ts
export const webhookHandlers = {
  TRANSACTIONS: {
    SYNC_UPDATES_AVAILABLE: handleSyncUpdates,
    INITIAL_UPDATE: handleInitialUpdate,
    // ...
  },
  ITEM: {
    ERROR: handleItemError,
    // ...
  },
}
```

---

## Low Priority

### 15. Create Component Index Files

**Problem**: Feature directories lack index files, making imports verbose.

**Directories to add index.ts**:
- `src/components/transactions/analytics/`
- `src/components/transactions/detail/`
- `src/components/transactions/filters/`
- `src/components/transactions/list/`
- `src/components/transactions/modals/`

---

### 16. Extract Common Modal Logic

**Problem**: Transaction modals share similar form logic.

**Files**:
- `AddTransactionModal.tsx` (363 lines)
- `EditTransactionModal.tsx` (254 lines)
- `SplitTransactionModal.tsx` (315 lines)

**Solution**: Create shared form components:

```typescript
// src/components/transactions/forms/TransactionFormFields.tsx
export function TransactionFormFields({
  categories,
  accounts,
  tags,
  defaultValues
}) {
  // Shared category/subcategory/tag selection
}
```

---

### 17. Consolidate Logger Pattern

**Problem**: Repeated conditional logic in `src/lib/utils/logger.ts`.

Lines 29-43, 48-62, 67-86, 91-105, 110-124 all repeat:
```typescript
if (attributes) {
  console.log(message, formatAttributes(attributes))
} else {
  console.log(message)
}
```

**Solution**: Extract helper:

```typescript
function logToConsole(
  level: LogLevel,
  message: string,
  error?: unknown,
  attributes?: LogAttributes
) {
  const formatted = attributes ? formatAttributes(attributes) : undefined
  const args = [message, formatted, error].filter(Boolean)
  console[level](...args)
}
```

---

### 18. Document Minimal Utility Directories

**Problem**: Some directories have only 1 file, unclear if intentional.

- `src/lib/categories/` - only `images.ts`
- `src/lib/cache/` - only `reconnection-cache.ts`

**Solution**: Either consolidate into `utils/` or add README explaining future expansion plans.

---

## Implementation Order

1. **Week 1**: Critical items (1-3)
   - Split ChartsView and TransactionAnalytics
   - Consolidate chart directories
   - Extract server actions with validation

2. **Week 2**: High priority items (4-8)
   - Standardize API error handling
   - Reorganize query files
   - Extract shared selects
   - Fix duplicate split logic
   - Remove hardcoded colors

3. **Week 3**: Medium priority (9-14)
   - Split sync-service
   - Create constants file
   - Add Plaid route validation
   - Standardize component patterns
   - Fix hook naming

4. **Week 4**: Low priority (15-18)
   - Add index files
   - Extract modal logic
   - Consolidate logger
   - Document minimal directories

---

## Metrics

After implementing these improvements:

- **Lines of code reduced**: ~15-20% through DRY refactoring
- **Average component size**: From 400+ lines to <200 lines
- **Test coverage opportunity**: Smaller components are easier to test
- **Type safety**: Validation on all API inputs
- **Maintainability**: Clear separation of concerns

---

## Quick Wins (Can Do Now)

1. Rename `use-mobile.ts` → `useMobile.ts` (5 minutes)
2. Move hardcoded colors to CSS variables (30 minutes)
3. Extract `TRANSACTION_SELECT` constant (1 hour)
4. Add index.ts to component directories (30 minutes)
5. Create `src/lib/constants.ts` (45 minutes)
