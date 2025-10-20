# Type System Documentation

This directory contains the centralized type system for the Personal Finance App. The type system is organized into several modules to provide type safety from the database layer through to the frontend.

## File Structure

```
src/types/
├── README.md          # This file
├── index.ts           # Central export point for all types
├── prisma.ts          # Prisma-derived types and extractors
├── api.ts             # API schemas and types (with Zod validation)
├── components.ts      # React component prop types
└── transaction.ts     # Transaction utilities (backwards compatibility)
```

## Quick Start

### Importing Types

Always import types from the central index:

```typescript
import { SerializedTransaction, TransactionWithRelations } from '@/types'
```

### Common Patterns

#### 1. Fetching Data from Database (Server-Side)

```typescript
import { prisma } from '@/lib/prisma'
import { PrismaIncludes } from '@/types'

// Use the predefined include pattern
const transactions = await prisma.transaction.findMany({
  include: PrismaIncludes.transaction,
})
// Type is automatically: TransactionWithRelations[]
```

#### 2. Serializing for Client Components

```typescript
import { serializeTransaction } from '@/types'

// Server Component
export default async function Page() {
  const transactions = await prisma.transaction.findMany({
    include: PrismaIncludes.transaction,
  })

  // Serialize for client
  const serialized = transactions.map(serializeTransaction)

  return <ClientComponent transactions={serialized} />
}
```

#### 3. API Route with Validation

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { safeParseRequestBody, updateTransactionSchema } from '@/types/api'

export async function PATCH(req: NextRequest) {
  // Validate with Zod
  const parseResult = await safeParseRequestBody(req, updateTransactionSchema)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.errors },
      { status: 400 }
    )
  }

  const data = parseResult.data // Fully typed!
  // ... use data
}
```

#### 4. Client Components

```typescript
'use client'

import type { TransactionListProps } from '@/types'

export function TransactionList({ transactions }: TransactionListProps) {
  // transactions is fully typed as SerializedTransaction[]
  return (
    <div>
      {transactions.map((t) => (
        <div key={t.id}>{t.name}</div>
      ))}
    </div>
  )
}
```

## Module Details

### `prisma.ts` - Prisma Type Extractors

This file contains type-safe extractors for Prisma models with their relations.

**Key Exports:**

- `TransactionWithRelations` - Transaction with all common relations
- `TransactionWithAccount` - Transaction with account only
- `PlaidAccountWithRelations` - Plaid bank account with item and institution
- `CustomCategoryWithSubcategories` - Category with subcategories
- `HoldingWithRelations` - Holding with account and security
- `PrismaIncludes` - Reusable include patterns

**Example:**

```typescript
import { PrismaIncludes, type PlaidAccountWithRelations } from '@/types'

const accounts: PlaidAccountWithRelations[] = await prisma.plaidAccount.findMany({
  include: PrismaIncludes.plaidAccount,
})
```

### `api.ts` - API Schemas & Types

Contains Zod schemas for runtime validation and TypeScript types.

**Key Features:**

- Runtime validation with Zod
- Type inference from schemas
- Request/response types
- Helper functions

**Key Exports:**

- **Schemas:** `updateTransactionSchema`, `createTagSchema`, etc.
- **Types:** `SerializedTransaction`, `UpdateTransactionPayload`, etc.
- **Helpers:** `safeParseRequestBody()`, `createSuccessResponse()`

**Example:**

```typescript
import { z } from 'zod'
import { createTagSchema } from '@/types'

// Schema automatically validates
const result = createTagSchema.parse({
  name: 'Groceries',
  color: '#FF5733',
})

// Type is inferred
type CreateTagPayload = z.infer<typeof createTagSchema>
```

### `components.ts` - Component Types

React component prop types and UI-specific types.

**Key Exports:**

- Component props: `TransactionListProps`, `EditTransactionModalProps`
- UI types: `LoadingState`, `SortDirection`, `AsyncData<T>`
- Filter types: `TransactionFilters`, `DateRangeQuery`

**Example:**

```typescript
import type { TransactionListProps, LoadingState } from '@/types'

export function TransactionList({ transactions, showAccount }: TransactionListProps) {
  const [loading, setLoading] = useState<LoadingState>('idle')
  // ...
}
```

### `transaction.ts` - Transaction Utilities

Helper functions for working with transactions.

**Key Exports:**

- `serializeTransaction()` - Convert Prisma transaction to serialized form
- `TRANSACTION_INCLUDE` - Deprecated, use `PrismaIncludes.transaction`

## Best Practices

### 1. Server vs. Client Types

- **Server (API routes, Server Components):** Use Prisma types
  - `TransactionWithRelations`, `PlaidAccountWithRelations`
- **Client (Client Components):** Use serialized types
  - `SerializedTransaction`, `SerializedPlaidAccount`

### 2. Always Validate API Input

Use Zod schemas for all API route inputs:

```typescript
// ❌ Bad - no validation
const body = await req.json()
const { name } = body // Unsafe!

// ✅ Good - validated
const result = await safeParseRequestBody(req, updateTransactionSchema)
if (!result.success) {
  return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
}
const { name } = result.data // Type-safe!
```

### 3. Use Predefined Include Patterns

```typescript
// ❌ Bad - duplicate includes everywhere
const transactions = await prisma.transaction.findMany({
  include: {
    account: true,
    customCategory: true,
    // ... repeated everywhere
  },
})

// ✅ Good - use centralized pattern
import { PrismaIncludes } from '@/types'

const transactions = await prisma.transaction.findMany({
  include: PrismaIncludes.transaction,
})
```

### 4. Leverage Type Inference

Let TypeScript infer types when possible:

```typescript
// ❌ Redundant
const transactions: TransactionWithRelations[] = await prisma.transaction.findMany({
  include: PrismaIncludes.transaction,
}) as TransactionWithRelations[]

// ✅ Type is automatically inferred
const transactions = await prisma.transaction.findMany({
  include: PrismaIncludes.transaction,
})
```

### 5. Create Custom Zod Schemas for Forms

```typescript
import { z } from 'zod'

const myFormSchema = z.object({
  email: z.string().email(),
  amount: z.number().min(0),
})

type MyFormData = z.infer<typeof myFormSchema>
```

## Common Patterns

### Pattern: Fetching and Serializing Transactions

```typescript
// Server Component or API Route
import { prisma } from '@/lib/prisma'
import { PrismaIncludes, serializeTransaction } from '@/types'

const transactions = await prisma.transaction.findMany({
  include: PrismaIncludes.transaction,
  orderBy: { date: 'desc' },
})

const serialized = transactions.map(serializeTransaction)

return <TransactionList transactions={serialized} />
```

### Pattern: Creating a New API Endpoint

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { safeParseRequestBody } from '@/types/api'

// Define schema
const mySchema = z.object({
  field: z.string(),
})

export async function POST(req: NextRequest) {
  const parseResult = await safeParseRequestBody(req, mySchema)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid data', details: parseResult.error.errors },
      { status: 400 }
    )
  }

  const { field } = parseResult.data
  // Use field safely
}
```

### Pattern: Type-Safe Component Props

```typescript
import type { SerializedTransaction } from '@/types'

interface MyComponentProps {
  transaction: SerializedTransaction
  onUpdate?: (id: string) => void
}

export function MyComponent({ transaction, onUpdate }: MyComponentProps) {
  // transaction is fully typed
  return <div>{transaction.name}</div>
}
```

## Migration Guide

### Updating Existing Code

1. **Replace inline type definitions:**

```typescript
// Before
interface Transaction {
  id: string
  amount: string
  // ...
}

// After
import type { SerializedTransaction } from '@/types'
```

2. **Replace `any` types:**

```typescript
// Before
function processTransaction(t: any) { ... }

// After
import type { TransactionWithRelations } from '@/types'
function processTransaction(t: TransactionWithRelations) { ... }
```

3. **Add validation to API routes:**

```typescript
// Before
const body = await req.json()

// After
import { safeParseRequestBody, updateTransactionSchema } from '@/types'
const result = await safeParseRequestBody(req, updateTransactionSchema)
```

## TypeScript Configuration

The `tsconfig.json` has been updated with stricter checks:

- `strictNullChecks` - Catch null/undefined errors
- `noUnusedLocals` - Flag unused variables
- `noImplicitReturns` - Ensure all code paths return
- `noUncheckedIndexedAccess` - Safer array/object access

These help catch bugs at compile time.

## Troubleshooting

### "Type 'X' is not assignable to type 'Y'"

Make sure you're using the correct type for server vs. client:

- Server: `TransactionWithRelations` (Prisma type)
- Client: `SerializedTransaction` (JSON-serializable)

### "Cannot find module '@/types'"

Make sure the import path uses the alias:

```typescript
import { ... } from '@/types'  // ✅ Correct
import { ... } from '../types' // ❌ Avoid
```

### Zod Validation Errors

Check the schema definition and ensure your data matches:

```typescript
const result = schema.safeParse(data)
if (!result.success) {
  console.log(result.error.errors) // See what failed
}
```

## Further Reading

- [Prisma Type System](https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
