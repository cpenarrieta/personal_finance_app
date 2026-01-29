# Cache Components Refactor Plan

## Critical Issues Found

### 1. **Pages bypass cache entirely** (HIGH)
All major pages use `*Convex.tsx` client components with `useQuery()`, completely bypassing the cached server components:

| Page | Uses | Should Use |
|------|------|-----------|
| Homepage | `DashboardConvex` (client) | Server + Suspense |
| `/transactions` | `TransactionsPageConvex` (client) | Server + Suspense |
| `/transactions/[id]` | `TransactionDetailConvex` (client) | `TransactionDetailAsync` |
| `/accounts` | `AccountsListConvex` (client) | `AccountsListAsync` |
| `/review-transactions` | `ReviewTransactionsConvex` (client) | Server + Suspense |

The cached async components exist (`DashboardMetricsSection`, `TransactionDetailAsync`, etc.) but are **never used**.

### 2. **revalidateTag wrong signature** (HIGH) - 50+ occurrences
```typescript
// Wrong - second arg is ignored
revalidateTag("transactions", "max")

// Correct
revalidateTag("transactions")
```

### 3. **cacheLife missing revalidate** (MEDIUM)
```typescript
// Current - stale but no background revalidation
cacheLife({ stale: 60 * 60 * 24 })

// Better - enables stale-while-revalidate
cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
```

### 4. **No Suspense boundaries** (MEDIUM)
Pages don't wrap async components in Suspense, so no PPR benefit.

---

## Architecture Decision

**Problem**: Two parallel implementations exist:
1. `*Async.tsx` - Server components with `"use cache"` (correct but unused)
2. `*Convex.tsx` - Client components with `useQuery()` (used everywhere)

**Tradeoff**:
- **Server cache**: Fast initial loads, but stale until revalidated
- **Client useQuery**: Real-time reactive updates, but no server caching

**Recommendation for finance app**: Hybrid approach
- Use server cache + Suspense for initial render (fast PPR)
- Keep real-time updates for interactive features via client components where needed
- Most financial data doesn't need real-time - 5min cache is fine

---

## Phase 1: Homepage (Priority)

### Files to change:
- `src/app/(app)/page.tsx` - Use server components + Suspense
- `src/lib/dashboard/data.ts` - Fix cacheLife config

### Target architecture:
```tsx
// app/(app)/page.tsx
export default async function Page() {
  return (
    <div className="space-y-8">
      {/* Static shell - instant */}
      <DashboardHeader />
      <MonthFilter />

      {/* Cached sections with Suspense */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <DashboardMetricsSection monthsBack={monthsBack} />
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardChartsSection monthsBack={monthsBack} />
      </Suspense>

      <Suspense fallback={<TransactionTableSkeleton />}>
        <DashboardTopExpensesSection monthsBack={monthsBack} />
      </Suspense>
    </div>
  )
}
```

### Problem: searchParams for monthsBack
The homepage reads `?months=X` from URL. Options:
1. Pass as prop from page (makes page dynamic)
2. Use `'use cache: private'` to read searchParams inside cache
3. Client component just for the filter picker, server for data

---

## Phase 2: Transactions Page

### Files to change:
- `src/app/(app)/transactions/page.tsx`
- Create `TransactionsListAsync.tsx` if needed

### Complexity:
- Has URL filters (`searchParams`) - makes page dynamic
- Heavy client interactivity (filtering, sorting, selection)
- May benefit more from client approach for UX

**Recommendation**: Keep mostly client for this page, but could cache the initial data fetch.

---

## Phase 3: Transaction Detail

### Files to change:
- `src/app/(app)/transactions/[id]/page.tsx`

### Simple fix - use existing async component:
```tsx
// Before
import { TransactionDetailConvex } from "@/components/transactions/detail/TransactionDetailConvex"

// After
import { Suspense } from "react"
import { TransactionDetailAsync } from "@/components/transactions/detail/TransactionDetailAsync"
import { TransactionDetailSkeleton } from "@/components/transactions/detail/TransactionDetailSkeleton"

export default async function Page({ params }) {
  const { id } = await params
  return (
    <Suspense fallback={<TransactionDetailSkeleton />}>
      <TransactionDetailAsync id={id} />
    </Suspense>
  )
}
```

---

## Phase 4: Fix revalidateTag calls

### Files with wrong calls:
- `src/lib/sync/sync-transactions.ts`
- `src/lib/sync/sync-service.ts`
- `src/lib/plaid/webhook-handlers.ts`
- `src/app/api/cron/weekly-summary/route.ts`
- `src/app/api/transactions/*.ts`
- `src/app/(app)/investments/holdings/page.tsx`
- `src/app/(app)/review-transactions/actions/confirm-transactions.ts`
- `src/app/(app)/settings/manage-categories/actions.ts`
- `src/app/(app)/settings/manage-tags/actions.ts`
- `src/app/(app)/transactions/[id]/actions.ts`
- `src/app/api/plaid/*.ts`

### Fix pattern:
```typescript
// Find and replace all:
revalidateTag("tag", "max")
// With:
revalidateTag("tag")
```

---

## Phase 5: Fix cacheLife config

### Update all cached queries:
```typescript
// Current
cacheLife({ stale: 60 * 60 * 24 })

// Better
cacheLife({
  stale: 300,       // 5 min - serve stale while revalidating
  revalidate: 3600, // 1 hour - background revalidation interval
  expire: 86400,    // 24 hours - hard expiration
})
```

Or use built-in profile:
```typescript
cacheLife('hours')  // Built-in profile for hourly revalidation
```

---

## Phase 6: Other Pages

| Page | Action |
|------|--------|
| `/accounts` | Use `AccountsListAsync` + Suspense |
| `/accounts/[id]` | Use `AccountDetailAsync` + Suspense |
| `/review-transactions` | Needs client interactivity, keep hybrid |
| `/investments/holdings` | Use async + Suspense |
| `/investments/transactions` | Use async + Suspense |
| `/settings/*` | Use async + Suspense |

---

## Summary

1. **Phase 1**: Homepage - Convert to server + Suspense
2. **Phase 2**: Transactions - Evaluate, may stay client
3. **Phase 3**: Transaction detail - Use existing async component
4. **Phase 4**: Fix all revalidateTag calls (remove "max")
5. **Phase 5**: Fix cacheLife config (add revalidate)
6. **Phase 6**: Other pages - Systematic conversion

---

## Unresolved Questions

1. Homepage month filter - server or client component?
2. Transactions page - worth converting given heavy client interactivity?
3. Real-time requirements - any pages NEED instant updates?
4. Delete `*Convex.tsx` components after migration or keep for real-time features?
