# Generated Columns for Serialization-Free Data Passing

## Overview

This project uses **PostgreSQL generated columns** to eliminate the need for manual serialization when passing data from Server Components to Client Components. Generated columns are automatically computed and always stay in sync with their source columns.

## What Are Generated Columns?

Generated columns are database columns that are **automatically computed** from other columns. PostgreSQL keeps them in sync automatically - you never need to manually update them.

### Benefits

✅ **Always in sync** - Database automatically updates them when source columns change
✅ **Zero maintenance** - No code changes needed in sync functions
✅ **Type-safe** - Prisma provides proper types
✅ **No serialization** - Numbers and strings can be passed directly to client
✅ **Rollback-safe** - Can drop generated columns without data loss

### Drawbacks

❌ **Extra storage** - Each generated column uses disk space
❌ **Slightly slower writes** - Columns are computed on INSERT/UPDATE

## Available Generated Columns

### Decimal → Number Columns

All `Decimal` fields have corresponding `*_number` columns:

| Model | Source Column | Generated Column |
|-------|--------------|------------------|
| Transaction | amount | amount_number |
| PlaidAccount | currentBalance | current_balance_number |
| PlaidAccount | availableBalance | available_balance_number |
| PlaidAccount | creditLimit | credit_limit_number |
| Holding | quantity | quantity_number |
| Holding | costBasis | cost_basis_number |
| Holding | institutionPrice | institution_price_number |
| InvestmentTransaction | amount | amount_number |
| InvestmentTransaction | price | price_number |
| InvestmentTransaction | quantity | quantity_number |
| InvestmentTransaction | fees | fees_number |

### DateTime → String Columns

All `DateTime` fields have corresponding `*_string` columns:

| Model | Source Column | Generated Column |
|-------|--------------|------------------|
| Transaction | date | date_string |
| Transaction | authorizedDate | authorized_date_string |
| Transaction | createdAt | created_at_string |
| Transaction | updatedAt | updated_at_string |
| PlaidAccount | balanceUpdatedAt | balance_updated_at_string |
| PlaidAccount | createdAt | created_at_string |
| PlaidAccount | updatedAt | updated_at_string |
| Holding | institutionPriceAsOf | institution_price_as_of_string |
| Holding | createdAt | created_at_string |
| Holding | updatedAt | updated_at_string |
| InvestmentTransaction | date | date_string |
| InvestmentTransaction | createdAt | created_at_string |
| InvestmentTransaction | updatedAt | updated_at_string |
| CustomCategory | createdAt | created_at_string |
| CustomCategory | updatedAt | updated_at_string |
| CustomSubcategory | createdAt | created_at_string |
| CustomSubcategory | updatedAt | updated_at_string |
| Tag | createdAt | created_at_string |
| Tag | updatedAt | updated_at_string |
| CategoryGroup | createdAt | created_at_string |
| CategoryGroup | updatedAt | updated_at_string |
| TransactionTag | createdAt | created_at_string |
| CategoryGroupItem | createdAt | created_at_string |
| Institution | createdAt | created_at_string |
| Item | createdAt | created_at_string |
| Item | updatedAt | updated_at_string |
| Security | createdAt | created_at_string |
| Security | updatedAt | updated_at_string |

**Format:** `YYYY-MM-DD HH24:MI:SS.MS` (e.g., "2024-01-15 14:30:00.123")

## Usage Examples

### Before (With Manual Serialization)

```typescript
// ❌ OLD WAY - Manual serialization required
// src/app/transactions/page.tsx
export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany()

  // Manual serialization - error-prone and verbose
  const serialized = transactions.map(t => ({
    ...t,
    amount: t.amount.toNumber(),
    date: t.date.toISOString(),
    authorizedDate: t.authorizedDate?.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return <TransactionList transactions={serialized} />
}
```

### After (With Generated Columns)

```typescript
// ✅ NEW WAY - Use generated columns, no serialization needed!
// src/app/transactions/page.tsx
export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    select: {
      id: true,
      name: true,
      amount_number: true,        // ← Already a number!
      date_string: true,           // ← Already a string!
      authorized_date_string: true, // ← Already a string!
      pending: true,
      merchantName: true,
      // ... other fields
    }
  })

  // Pass directly to client component - no serialization!
  return <TransactionList transactions={transactions} />
}
```

### Client Component Types

```typescript
// src/components/TransactionList.tsx
'use client'

interface Transaction {
  id: string
  name: string
  amount_number: number          // ← number, not Decimal!
  date_string: string            // ← string, not Date!
  authorized_date_string?: string
  pending: boolean
  merchantName?: string
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <div>
      {transactions.map(t => (
        <div key={t.id}>
          <span>{t.name}</span>
          {/* No need to call .toNumber() or .toISOString()! */}
          <span>${t.amount_number.toFixed(2)}</span>
          <span>{new Date(t.date_string).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  )
}
```

## Sync Functions - No Changes Needed! ✨

The beauty of generated columns is that **sync functions don't need any changes**:

```typescript
// src/lib/sync-service.ts - NO CHANGES REQUIRED!
await prisma.transaction.create({
  plaidTransactionId: t.transaction_id,
  amount: new Prisma.Decimal(t.amount),  // ← Sets amount
  date: new Date(t.date),                 // ← Sets date
  // amount_number and date_string are auto-populated! ✨
})
```

When you insert or update the source column (`amount`, `date`), PostgreSQL automatically computes and stores the generated columns (`amount_number`, `date_string`).

## Best Practices

### 1. Always Use `select` to Choose Generated Columns

Don't fetch the source column if you only need the generated column:

```typescript
// ✅ GOOD - Only fetch what you need
const transactions = await prisma.transaction.findMany({
  select: {
    id: true,
    name: true,
    amount_number: true,  // Only fetch the number version
  }
})

// ❌ BAD - Fetches both source and generated (wasteful)
const transactions = await prisma.transaction.findMany() // Gets amount AND amount_number
```

### 2. Prefer Generated Columns for Client Components

```typescript
// ✅ GOOD - Use generated columns for client components
const data = await prisma.transaction.findMany({
  select: {
    id: true,
    amount_number: true,    // For client component
    date_string: true,      // For client component
  }
})
return <ClientComponent data={data} />

// ✅ ALSO GOOD - Use source columns for server-side calculations
const transactions = await prisma.transaction.findMany({
  select: {
    amount: true,  // For precise Decimal math on server
    date: true,    // For date comparisons on server
  }
})
const total = transactions.reduce((sum, t) => sum.add(t.amount), new Prisma.Decimal(0))
```

### 3. Use Source Columns for Precise Math

Generated `Float` columns lose precision compared to `Decimal`:

```typescript
// ✅ GOOD - Use Decimal for precise calculations
const transactions = await prisma.transaction.findMany({
  select: { amount: true }  // Get Decimal for math
})
const total = transactions.reduce(
  (sum, t) => sum.add(t.amount),
  new Prisma.Decimal(0)
)

// ❌ BAD - Float loses precision for money calculations
const transactions = await prisma.transaction.findMany({
  select: { amount_number: true }
})
const total = transactions.reduce((sum, t) => sum + t.amount_number, 0) // ❌ Precision loss!
```

### 4. Update Only Source Columns

**Never** try to manually update generated columns:

```typescript
// ✅ GOOD - Update source column, generated column updates automatically
await prisma.transaction.update({
  where: { id: txId },
  data: { amount: new Prisma.Decimal(100) }  // amount_number auto-updates!
})

// ❌ BAD - Generated columns are read-only!
await prisma.transaction.update({
  where: { id: txId },
  data: { amount_number: 100 }  // ❌ ERROR: Cannot update generated column
})
```

## Migration Details

### How It Works

The migration created a PostgreSQL function and generated columns:

```sql
-- Immutable function for timestamp conversion
CREATE OR REPLACE FUNCTION timestamp_to_string(ts timestamp)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN ts IS NULL THEN NULL
    ELSE to_char(ts, 'YYYY-MM-DD HH24:MI:SS.MS')
  END
$$;

-- Example generated column
ALTER TABLE "Transaction"
  ADD COLUMN amount_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(amount AS double precision)) STORED;

ALTER TABLE "Transaction"
  ADD COLUMN date_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string(date)) STORED;
```

### Why IMMUTABLE?

PostgreSQL requires functions used in generated columns to be marked as `IMMUTABLE`. The built-in `to_char()` function isn't marked as immutable, so we created a wrapper function.

### Rollback

To remove generated columns (keeps data):

```sql
-- Remove generated columns (source data remains intact)
ALTER TABLE "Transaction" DROP COLUMN amount_number;
ALTER TABLE "Transaction" DROP COLUMN date_string;
-- etc...

-- Remove helper function
DROP FUNCTION IF EXISTS timestamp_to_string(timestamp);
```

## Performance Considerations

### Storage Impact

Generated columns use disk space:
- `DOUBLE PRECISION`: 8 bytes
- `TEXT` (timestamp): ~25 bytes on average

For a table with 100,000 transactions:
- 5 generated columns ≈ 5MB extra storage (negligible)

### Write Performance

Generated columns add minimal overhead on INSERT/UPDATE:
- Typically <1ms per row for simple expressions
- Worth the trade-off to eliminate serialization code

### Read Performance

Generated columns can actually **improve** read performance:
- No serialization overhead in application code
- Can be indexed like regular columns
- Smaller SELECT queries (fetch only what you need)

## Common Patterns

### Pattern 1: Transaction List

```typescript
// Server Component
export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    select: {
      id: true,
      name: true,
      amount_number: true,
      date_string: true,
      pending: true,
      merchantName: true,
      customCategory: {
        select: { name: true }
      }
    },
    orderBy: { date: 'desc' },
    take: 100,
  })

  return <TransactionList transactions={transactions} />
}
```

### Pattern 2: Account Balances

```typescript
// Server Component
export default async function AccountsPage() {
  const accounts = await prisma.plaidAccount.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      current_balance_number: true,
      available_balance_number: true,
      balance_updated_at_string: true,
    }
  })

  return <AccountList accounts={accounts} />
}
```

### Pattern 3: Investment Holdings

```typescript
// Server Component
export default async function HoldingsPage() {
  const holdings = await prisma.holding.findMany({
    select: {
      id: true,
      quantity_number: true,
      institution_price_number: true,
      cost_basis_number: true,
      security: {
        select: {
          tickerSymbol: true,
          name: true,
        }
      }
    }
  })

  return <HoldingsPortfolio holdings={holdings} />
}
```

## Troubleshooting

### Type Errors

If TypeScript complains that generated columns don't exist:

```bash
# Regenerate Prisma Client
npx prisma generate
```

### Null Handling

Generated columns are nullable if the source column is nullable:

```typescript
interface Transaction {
  amount_number: number          // amount is required → non-null
  authorized_date_string?: string // authorizedDate is optional → nullable
}
```

### Date String Parsing

When parsing date strings in client components:

```typescript
// ✅ GOOD - Parse the string to Date
const date = new Date(transaction.date_string)
console.log(date.toLocaleDateString())

// ❌ BAD - Using the string directly in date methods
console.log(transaction.date_string.toLocaleDateString()) // ❌ ERROR: string has no such method
```

## Summary

### ✅ Do

- Use generated columns when passing data to client components
- Use `select` to fetch only the columns you need
- Use source columns for precise server-side calculations
- Let PostgreSQL handle synchronization automatically

### ❌ Don't

- Try to manually update generated columns
- Use generated Float columns for precise money math
- Fetch both source and generated columns (wasteful)
- Modify sync functions (they work automatically!)

## Questions?

If you need to add generated columns to new tables/columns, follow the pattern in `prisma/migrations/add_generated_columns.sql`.
