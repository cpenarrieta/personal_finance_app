# Data Fetching Strategy

**Rule**: Fetch data in Server Components using cached queries. Pass as props to Client Components.

## Pattern

### Server Component (Page)
```typescript
import { getAllTransactions, getAllCategories, getAllTags } from '@/lib/db/queries'

export default async function Page() {
  const [transactions, categories, tags] = await Promise.all([
    getAllTransactions(),    // Cached 24h
    getAllCategories(),      // Cached 24h
    getAllTags(),           // Cached 24h
  ])

  return <ClientComponent transactions={transactions} categories={categories} tags={tags} />
}
```

### Cached Query (Next.js 16)
```typescript
// lib/db/queries.ts
import { cacheTag, cacheLife } from "next/cache"

export async function getAllCategories() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })  // 24h
  cacheTag("categories")

  return prisma.category.findMany({...})
}
```

### Client Component
```typescript
'use client'

interface Props {
  transactions: Array<{ id: string; amount_number: number; date_string: string }>
  categories: Array<{ id: string; name: string }>
}

export function ClientComponent({ transactions, categories }: Props) {
  return <div>{/* Use props directly */}</div>
}
```

## Generated Columns

Use for client-compatible types:

```typescript
// ✅ Client components
select: {
  amount_number: true,    // Float (not Decimal)
  date_string: true,      // String (not Date)
}

// ✅ Server calculations
select: {
  amount: true,           // Decimal (precise math)
  date: true,             // Date (operations)
}
```

## Cache Invalidation

**Next.js 16 has TWO caches** - invalidate BOTH:

```typescript
import { revalidateTag, revalidatePath } from "next/cache"

async function updateData() {
  await prisma.transaction.update(...)

  revalidateTag("transactions", "max")  // Server Data Cache
  revalidatePath("/", "layout")          // Client Router Cache
}
```

Missing `revalidatePath()` = stale data on navigation.

## Rules

**Do**:
- Fetch with cached queries from `@/lib/db/queries`
- Use generated columns for Client Components
- Pass as props (never fetch in `useEffect`)
- Invalidate both caches on mutation

**Don't**:
- Fetch reference data client-side (`/api/categories`, `/api/tags`)
- Use React Context for data that can be props
