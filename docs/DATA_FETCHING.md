# Data Fetching Strategy

## Overview
Next.js 16 Server Components with **"use cache" directive** for explicit caching. Data fetched on server using Prisma, passed as props to Client Components.

## Key Principles

1. **Server-Side Fetching**: Use cached query functions from `@/lib/db/queries`
2. **Next.js 16 Caching**: Queries use `"use cache"` directive with `cacheLife()` and `cacheTag()`
3. **No Client-Side Fetching**: Never fetch reference data (categories, tags) from Client Components
4. **Props Over Context**: Pass data as props, not via React Context
5. **Generated Columns**: Use PostgreSQL generated columns (`date_string`, `amount_number`) for client-compatible types

## Implementation Pattern

### Server Component (Page)
```typescript
// app/(app)/page.tsx
import { getAllTransactions, getAllCategories, getAllTags } from '@/lib/db/queries'

export default async function Page() {
  // Parallel fetching with Next.js 16 cached queries
  const [transactions, categories, tags] = await Promise.all([
    getAllTransactions(),    // Cached 24h, tagged "transactions"
    getAllCategories(),      // Cached 24h, tagged "categories"
    getAllTags(),           // Cached 24h, tagged "tags"
  ])

  return <ClientComponent transactions={transactions} categories={categories} tags={tags} />
}
```

### Cached Query Function (Next.js 16)
```typescript
// lib/db/queries.ts
import { cacheTag, cacheLife } from "next/cache"
import { prisma } from "@/lib/db/prisma"

export async function getAllCategories() {
  "use cache"  // Next.js 16 explicit caching
  cacheLife({ stale: 60 * 60 * 24 })  // 24h
  cacheTag("categories")  // Auto-invalidate with revalidateTag

  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      subcategories: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })
}
```

### Client Component
```typescript
'use client'

interface Props {
  transactions: Array<{ id: string; name: string; amount_number: number; date_string: string }>
  categories: Array<{ id: string; name: string; subcategories: Array<{ id: string; name: string }> }>
  tags: Array<{ id: string; name: string; color: string }>
}

export function ClientComponent({ transactions, categories, tags }: Props) {
  return (
    <div>
      {transactions.map(t => (
        <div key={t.id}>
          {t.name} - ${t.amount_number.toFixed(2)} - {new Date(t.date_string).toLocaleDateString()}
        </div>
      ))}
    </div>
  )
}
```

## Reference Data

Always fetch server-side and pass as props:
- **Categories**: `getAllCategories()` with subcategories
- **Tags**: `getAllTags()`
- **Accounts**: `getAllAccounts()` when needed

## Components Requiring Props

These components need categories/tags passed as props (never fetch internally):
- `SearchableTransactionList`
- `EditTransactionModal`
- `SplitTransactionModal`
- `TransactionDetailView`

## Benefits

1. **Performance**: Data fetched once, cached 24h with Next.js 16 "use cache"
2. **Auto-invalidation**: `cacheTag()` enables targeted cache invalidation
3. **No Loading States**: Client components render immediately
4. **Type Safety**: Full TypeScript support
5. **No Client API Calls**: No `/api/categories` or `/api/tags` endpoints needed
6. **Generated Columns**: Client-compatible types (numbers/strings) without conversion

## When to Use Client-Side Fetching

**Only for:**
- User mutations (POST, PATCH, DELETE)
- Real-time data requiring refresh
- Conditional loading based on user interaction

**Never for:**
- Reference data (categories, tags)
- Initial page data

## Generated Columns

Use generated columns for client-compatible data types:

```typescript
// ✅ Client components - use generated columns
select: {
  amount_number: true,        // Float (not Decimal)
  date_string: true,          // String (not Date)
  authorized_date_string: true,
  created_at_string: true,
}

// ✅ Server calculations - use source columns
select: {
  amount: true,  // Decimal (for precise math)
  date: true,    // Date (for date operations)
}
```

## Checklist

When adding pages needing reference data:
1. Fetch with cached queries from `@/lib/db/queries`
2. Use generated columns for Client Components
3. Pass as props (never fetch in `useEffect`)
4. Update TypeScript interfaces in `@/types`
