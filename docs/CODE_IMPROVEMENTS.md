# Code Organization & Readability Improvements

This document outlines recommended refactoring improvements for the personal finance app, organized by priority.

---

## Progress Summary

| Status | Count | Items |
|--------|-------|-------|
| ✅ Completed | 4 | ChartsView split, Server actions extraction, Chart constants, Hook naming fix |
| 🔄 In Progress | 0 | - |
| ⏳ Pending | 14 | Remaining items below |

### Completed Items

#### ✅ 1. Split ChartsView.tsx (Critical) - DONE
**Commit**: `refactor: split ChartsView.tsx (980 lines) into focused components`

Reduced ChartsView.tsx from **980 lines to 125 lines** (87% reduction).

**New files created:**
- `src/hooks/useChartData.ts` - Chart data calculations hook
- `src/lib/constants/charts.ts` - Chart colors and tab definitions
- `src/components/transactions/analytics/ChartFiltersPanel.tsx` - Filter UI
- `src/components/transactions/analytics/charts/SubcategoryChartTab.tsx`
- `src/components/transactions/analytics/charts/MonthlyComparisonChartTab.tsx`
- `src/components/transactions/analytics/charts/SpendingTrendsChartTab.tsx`
- `src/components/transactions/analytics/charts/IncomeVsExpensesChartTab.tsx`
- `src/components/transactions/analytics/charts/CategoryBreakdownChartTab.tsx`
- `src/components/transactions/analytics/charts/index.ts`

**Benefits:**
- Reuses existing `useTransactionFilters` hook (no duplicate filter logic)
- Each chart tab is a focused component under 100 lines
- Chart colors now use CSS variables for theme consistency

---

#### ✅ 3. Extract Server Actions with Validation (Critical) - DONE
**Commit**: `refactor: extract server actions with Zod validation`

Moved inline server actions from component files to dedicated action files with Zod validation.

**New files created:**
- `src/app/(app)/settings/manage-categories/actions.ts` - 5 validated actions
- `src/app/(app)/settings/manage-tags/actions.ts` - 3 validated actions

**Updated files:**
- `src/types/api.ts` - Added validation schemas
- `src/components/settings/ManageCategoriesAsync.tsx` - Now imports from action file
- `src/components/settings/ManageTagsAsync.tsx` - Now imports from action file

**Validation schemas added:**
- `createCategorySchema` with isTransferCategory field
- `updateCategorySchema`, `deleteCategorySchema`
- `createSubcategorySchema`, `deleteSubcategorySchema`
- `updateTagSchema`, `deleteTagSchema`

---

#### ✅ 8. Chart Colors Using CSS Variables (High) - DONE
**Included in ChartsView refactor**

Created `src/lib/constants/charts.ts` with theme-aware colors:
```typescript
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  // ...
]
```

---

#### ✅ 13. Fix Naming Inconsistency in Hooks (Medium) - DONE
**Commit**: `refactor: rename use-mobile.ts to useMobile.ts for consistent naming`

- Renamed `src/hooks/use-mobile.ts` → `src/hooks/useMobile.ts`
- Updated import in `src/components/ui/sidebar.tsx`

All hooks now follow camelCase naming convention.

---

## Remaining Items

### Critical Priority

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

### High Priority

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

### Medium Priority

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

**Solution**: Centralize configuration:

```typescript
// src/lib/constants.ts
export const SYNC_CONFIG = {
  HISTORICAL_START_DATE: "2024-01-01",
  TRANSACTION_BATCH_SIZE: 500,
  API_RATE_LIMIT_DELAY_MS: 12000,
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

### Low Priority

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

## Quick Wins (Can Do Now)

1. ~~Move hardcoded colors to CSS variables~~ ✅ Done
2. ~~Rename `use-mobile.ts` → `useMobile.ts`~~ ✅ Done
3. Extract `TRANSACTION_SELECT` constant (1 hour)
4. Add index.ts to component directories (30 minutes)
5. Create `src/lib/constants.ts` for sync config (45 minutes)
