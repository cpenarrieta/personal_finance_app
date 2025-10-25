# Data Fetching Strategy

## Overview
This app uses **Next.js 15 Server Components** for data fetching, following a "fetch once, pass down" pattern. Data is fetched on the server using Prisma and passed as props through the component tree.

## Key Principles

1. **Server-Side Fetching**: Fetch data in Server Components (page.tsx files) using Prisma
2. **No Client-Side API Calls**: Avoid fetching categories, tags, or other static/reference data from client components
3. **Props Over Context**: Pass data through props instead of using React Context
4. **Parallel Fetching**: Use `Promise.all()` to fetch multiple datasets in parallel

## Implementation Pattern

### Server Component (Page)
```typescript
// app/some-page/page.tsx
import { prisma } from '@/lib/prisma'

export default async function SomePage() {
  // Fetch all data in parallel on the server
  const [transactions, categories, tags] = await Promise.all([
    prisma.transaction.findMany({
      include: TRANSACTION_INCLUDE,
      orderBy: { date: 'desc' },
    }),
    prisma.customCategory.findMany({
      include: {
        subcategories: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  // Serialize data (convert Dates to ISO strings)
  const serializedTransactions = transactions.map(serializeTransaction)
  const serializedCategories = categories.map(cat => ({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    subcategories: cat.subcategories.map(sub => ({
      ...sub,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  }))
  const serializedTags = tags.map(tag => ({
    ...tag,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  }))

  return (
    <div>
      <ClientComponent
        transactions={serializedTransactions}
        categories={serializedCategories}
        tags={serializedTags}
      />
    </div>
  )
}
```

### Client Component
```typescript
// components/ClientComponent.tsx
'use client'

import type { CustomCategoryWithSubcategories, SerializedTag } from '@/types'

interface ClientComponentProps {
  transactions: SerializedTransaction[]
  categories: CustomCategoryWithSubcategories[]
  tags: SerializedTag[]
}

export function ClientComponent({ transactions, categories, tags }: ClientComponentProps) {
  // Use the data directly, no fetching needed
  return (
    <div>
      <EditTransactionModal
        categories={categories}
        tags={tags}
        // ... other props
      />
    </div>
  )
}
```

## Common Reference Data

The following data should be fetched server-side and passed as props:

- **Categories**: `prisma.customCategory.findMany()` with subcategories included
- **Tags**: `prisma.tag.findMany()`
- **Accounts**: `prisma.plaidAccount.findMany()` when needed for dropdowns

## Pages Using This Pattern

✅ **Implemented:**
- `/transactions` - Fetches transactions, categories, tags
- `/accounts/[id]` - Fetches transactions, categories, tags for a specific account
- `/transactions/[id]` - Fetches single transaction, categories, tags

## Components Receiving Reference Data

The following components **require** categories/tags as props (do NOT fetch internally):

- `SearchableTransactionList` - needs categories and tags
- `EditTransactionModal` - needs categories and tags
- `SplitTransactionModal` - needs categories
- `TransactionDetailView` - needs categories and tags (passes to modals)

## Benefits of This Approach

1. **Performance**: Data fetched once on the server, not on every modal open
2. **Caching**: Next.js automatically caches server component data
3. **No Loading States**: Client components render immediately with data
4. **Type Safety**: Full TypeScript support with serialized types
5. **Reduced API Calls**: No `/api/custom-categories` or `/api/tags` calls from client

## When to Use Client-Side Fetching

**Only use client-side API calls for:**
- User actions that modify data (POST, PATCH, DELETE)
- Real-time data that needs to refresh
- Conditional data loading based on user interaction

**Never use client-side fetching for:**
- Categories (static reference data)
- Tags (static reference data)
- Initial page data (use server components)

## Type Definitions

All component prop interfaces should include categories/tags when needed:

```typescript
// types/components.ts
export interface EditTransactionModalProps {
  transaction: SerializedTransaction
  onClose: () => void
  categories: CustomCategoryWithSubcategories[]
  tags: SerializedTag[]
}

export interface SearchableTransactionListProps {
  transactions: SerializedTransaction[]
  categories: CustomCategoryWithSubcategories[]
  tags: SerializedTag[]
  showAccount?: boolean
}
```

## Serialization Guidelines

Always serialize Prisma data before passing to client components:

```typescript
// ❌ Don't do this (Date objects can't be serialized)
<ClientComponent data={prismaData} />

// ✅ Do this (serialize dates to strings)
const serialized = prismaData.map(item => ({
  ...item,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
}))
<ClientComponent data={serialized} />
```

## Migration Checklist

When adding a new page or component that needs reference data:

1. ✅ Fetch categories/tags in the Server Component (page.tsx)
2. ✅ Serialize the data (convert Dates to ISO strings)
3. ✅ Pass as props to Client Components
4. ✅ Update TypeScript interfaces in `types/components.ts`
5. ✅ Remove any `useEffect` fetching from client components
6. ✅ Remove `/api/custom-categories` and `/api/tags` calls
