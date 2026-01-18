# Data Fetching Strategy

**Rule**: Use Convex for all data operations. Server Components use `fetchQuery`, Client Components use `useQuery` for real-time updates.

## Pattern

### Server Component (Page)
```typescript
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export default async function Page() {
  const [transactions, categories, tags] = await Promise.all([
    fetchQuery(api.transactions.getAll),
    fetchQuery(api.categories.getAll),
    fetchQuery(api.tags.getAll),
  ])

  return <ClientComponent transactions={transactions} categories={categories} tags={tags} />
}
```

### Client Component (Real-time)
```typescript
'use client'
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export function ClientComponent() {
  // Real-time data - auto-updates when data changes
  const transactions = useQuery(api.transactions.getAll)

  // Mutations
  const updateTransaction = useMutation(api.transactions.update)

  const handleUpdate = async (id: string, name: string) => {
    await updateTransaction({ id, name })
    // No manual refetch needed - useQuery auto-updates
  }
}
```

### Convex Query Definition
```typescript
// convex/transactions.ts
import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("transactions").collect()
  },
})

export const update = mutation({
  args: {
    id: v.id("transactions"),
    name: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name })
  },
})
```

## Server vs Client Components

| Use Case | Pattern |
|----------|---------|
| Initial page load | Server Component + `fetchQuery` |
| Real-time updates needed | Client Component + `useQuery` |
| User interactions/mutations | Client Component + `useMutation` |
| Static reference data | Either (Server preferred) |

## Rules

**Do**:
- Use `fetchQuery` in Server Components for initial data
- Use `useQuery` in Client Components for real-time updates
- Use `useMutation` for write operations
- Pass data as props when real-time not needed

**Don't**:
- Use fetch API for Convex data
- Create API routes for CRUD (use Convex directly)
- Manually refetch after mutations (Convex handles this)
