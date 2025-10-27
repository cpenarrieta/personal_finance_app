# Data Fetching Strategy

## Overview
This app uses **Next.js 15 Server Components** for data fetching, following a "fetch once, pass down" pattern. Data is fetched on the server using Prisma and passed as props through the component tree.

## Key Principles

1. **Server-Side Fetching**: Fetch data in Server Components (page.tsx files) using Prisma
2. **No Client-Side API Calls**: Avoid fetching categories, tags, or other static/reference data from client components
3. **Props Over Context**: Pass data through props instead of using React Context
4. **Parallel Fetching**: Use `Promise.all()` to fetch multiple datasets in parallel
5. **Generated Columns**: Use PostgreSQL generated columns (e.g., `date_string`, `amount_number`) for client-compatible data types

## Implementation Pattern

### Server Component (Page)
```typescript
// app/some-page/page.tsx
import { prisma } from '@/lib/prisma'

export default async function SomePage() {
  // Fetch all data in parallel on the server
  const [transactions, categories, tags] = await Promise.all([
    prisma.transaction.findMany({
      select: {
        id: true,
        name: true,
        merchantName: true,
        // Use generated columns for client-compatible types
        amount_number: true,        // Float instead of Decimal
        date_string: true,           // String instead of Date
        authorized_date_string: true,
        pending: true,
        notes: true,
        customCategory: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.customCategory.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        subcategories: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div>
      <ClientComponent
        transactions={transactions}
        categories={categories}
        tags={tags}
      />
    </div>
  )
}
```

### Client Component
```typescript
// components/ClientComponent.tsx
'use client'

interface ClientComponentProps {
  transactions: Array<{
    id: string
    name: string
    amount_number: number        // Already a number!
    date_string: string          // Already a string!
    pending: boolean
    // ... other fields
  }>
  categories: Array<{
    id: string
    name: string
    imageUrl: string | null
    subcategories: Array<{
      id: string
      name: string
      imageUrl: string | null
    }>
  }>
  tags: Array<{
    id: string
    name: string
    color: string
  }>
}

export function ClientComponent({ transactions, categories, tags }: ClientComponentProps) {
  // Use the data directly, no conversion needed
  return (
    <div>
      {transactions.map(t => (
        <div key={t.id}>
          <span>{t.name}</span>
          <span>${t.amount_number.toFixed(2)}</span>
          <span>{new Date(t.date_string).toLocaleDateString()}</span>
        </div>
      ))}
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
- `/charts` - Fetches aggregated transaction data
- `/analytics` - Fetches transaction analytics data
- `/investments/holdings` - Fetches holdings data
- `/investments/transactions` - Fetches investment transactions

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
4. **Type Safety**: Full TypeScript support with explicit types
5. **Reduced API Calls**: No `/api/custom-categories` or `/api/tags` calls from client
6. **No Type Conversion**: Generated columns provide client-compatible types (numbers/strings)

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
  transaction: {
    id: string
    name: string
    amount_number: number
    date_string: string
    // ... other fields using generated columns
  }
  onClose: () => void
  categories: Array<{
    id: string
    name: string
    subcategories: Array<{ id: string; name: string }>
  }>
  tags: Array<{
    id: string
    name: string
    color: string
  }>
}

export interface SearchableTransactionListProps {
  transactions: Array<{
    id: string
    name: string
    amount_number: number
    date_string: string
    // ... other fields
  }>
  categories: Array<{
    id: string
    name: string
    subcategories: Array<{ id: string; name: string }>
  }>
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  showAccount?: boolean
}
```

## Using Generated Columns

Always use generated columns when passing data to client components:

```typescript
// ✅ Do this - Use generated columns for client components
const transactions = await prisma.transaction.findMany({
  select: {
    id: true,
    amount_number: true,        // Float (client-compatible)
    date_string: true,           // String (client-compatible)
    authorized_date_string: true,
    created_at_string: true,
    updated_at_string: true,
  }
})
<ClientComponent transactions={transactions} />

// ✅ Also good - Use source columns for server-side calculations
const transactions = await prisma.transaction.findMany({
  select: {
    amount: true,  // Decimal (for precise math on server)
    date: true,    // Date (for date comparisons on server)
  }
})
const total = transactions.reduce((sum, t) => sum.add(t.amount), new Prisma.Decimal(0))
```

👉 See [GENERATED_COLUMNS.md](GENERATED_COLUMNS.md) for complete details on generated columns.

## Migration Checklist

When adding a new page or component that needs reference data:

1. ✅ Fetch categories/tags in the Server Component (page.tsx)
2. ✅ Use `select` to specify exactly which fields you need
3. ✅ Use generated columns (e.g., `amount_number`, `date_string`) for client components
4. ✅ Pass as props to Client Components
5. ✅ Update TypeScript interfaces in `types/components.ts`
6. ✅ Remove any `useEffect` fetching from client components
7. ✅ Remove `/api/custom-categories` and `/api/tags` calls
