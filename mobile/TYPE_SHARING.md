# Type Sharing Strategy: Mobile ↔ Next.js

This document explains how types are shared between the React Native mobile app and the Next.js web app.

## Strategy: API-as-Contract with Runtime Validation

The mobile app uses **Option 2: Runtime Validation** to ensure type safety with the Next.js API.

### How It Works

1. **Next.js API defines the contract**
   - API routes (e.g., `/api/transactions`) return JSON responses
   - Responses use generated columns (`amount_number`, `date_string`) for client compatibility
   - API validates requests using Zod schemas in `src/types/api.ts`

2. **Mobile validates responses**
   - Zod schemas in `mobile/lib/schemas/` define expected API response shapes
   - Type-safe API client in `mobile/lib/api.ts` validates all responses
   - TypeScript types are inferred from Zod schemas

3. **Screens use validated types**
   - Import types from `mobile/lib/schemas/transaction.ts`
   - Use API client from `mobile/lib/api.ts` instead of raw fetch
   - Get compile-time AND runtime type safety

## File Structure

```
mobile/
├── lib/
│   ├── schemas/
│   │   └── transaction.ts      # Zod schemas + inferred types
│   ├── api.ts                  # Type-safe API client with validation
│   └── auth.ts                 # Authentication utilities
└── screens/
    └── TransactionsScreen.tsx  # Uses Transaction type from schemas
```

## Example Usage

### Defining Types (mobile/lib/schemas/transaction.ts)

```typescript
import { z } from 'zod'

// Define schema matching API response
export const transactionSchema = z.object({
  id: z.string(),
  amount_number: z.number(),
  date_string: z.string(),
  name: z.string(),
  // ... more fields
})

// Infer TypeScript type from schema
export type Transaction = z.infer<typeof transactionSchema>
```

### Fetching Data (mobile/lib/api.ts)

```typescript
import { transactionsResponseSchema } from './schemas/transaction'

export async function fetchTransactions(limit = 100) {
  const response = await fetch(`${API_URL}/api/transactions?limit=${limit}`)
  const json = await response.json()

  // Validate response - throws if invalid!
  const parseResult = transactionsResponseSchema.safeParse(json)

  if (!parseResult.success) {
    return { success: false, error: 'Invalid API response' }
  }

  return { success: true, data: parseResult.data.transactions }
}
```

### Using in Screens (mobile/screens/TransactionsScreen.tsx)

```typescript
import { fetchTransactions } from '../lib/api'
import type { Transaction } from '../lib/schemas/transaction'

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const loadTransactions = async () => {
    const result = await fetchTransactions(100)

    if (result.success) {
      setTransactions(result.data) // Fully typed!
    }
  }

  // ... rest of component
}
```

## Benefits

### ✅ Type Safety
- **Compile-time**: TypeScript catches type errors during development
- **Runtime**: Zod validates API responses match expected shape

### ✅ No Coupling
- Mobile app is independent - doesn't import from Next.js
- Can be deployed separately, moved to different repo, etc.
- Works with any API that returns the same contract

### ✅ Early Error Detection
- API contract violations caught immediately
- Clear error messages show exactly what's wrong
- Validation errors logged for debugging

### ✅ Self-Documenting
- Schemas serve as living documentation
- Types are always in sync with runtime validation
- Easy to see what fields are available

## Maintenance

### When API Changes

1. **Update Next.js API** (`src/app/api/transactions/route.ts`)
2. **Update Zod schema** (`mobile/lib/schemas/transaction.ts`)
3. **Run type check**: `cd mobile && npm run type-check`
4. **Fix TypeScript errors** in screens using the changed types

### Adding New Endpoints

1. **Create Zod schema** in `mobile/lib/schemas/` for the response
2. **Add API client function** in `mobile/lib/api.ts` with validation
3. **Import and use** in your screens

Example:
```typescript
// mobile/lib/schemas/account.ts
export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  // ...
})

export type Account = z.infer<typeof accountSchema>

// mobile/lib/api.ts
export async function fetchAccounts(): Promise<ApiResult<Account[]>> {
  const response = await fetch(`${config.API_URL}/api/accounts`)
  const json = await response.json()
  const parseResult = accountsResponseSchema.safeParse(json)

  if (!parseResult.success) {
    return { success: false, error: 'Invalid API response' }
  }

  return { success: true, data: parseResult.data.accounts }
}
```

## Alternative Strategies (Not Currently Used)

### Option 1: Manual Type Sync (Previous Approach)
- Define types inline in screens
- Manually keep in sync with API
- ❌ No runtime validation
- ❌ Easy to drift out of sync

### Option 3: Shared Types Folder
- Create `types/` directory at repo root
- Both mobile and Next.js import from there
- ❌ Adds coupling between projects
- ❌ Harder to deploy independently
- ✅ Single source of truth (but Zod schemas achieve this too)

## Related Files

- **Next.js Types**: `/src/types/` - Server-side type definitions
- **Next.js API**: `/src/app/api/` - API route handlers
- **API Schemas**: `/src/types/api.ts` - Zod validation for requests
- **Mobile Schemas**: `/mobile/lib/schemas/` - Zod validation for responses
- **Mobile API Client**: `/mobile/lib/api.ts` - Type-safe fetch wrappers

## References

- [Zod Documentation](https://zod.dev)
- [TypeScript Handbook: Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [API-First Development](https://swagger.io/resources/articles/adopting-an-api-first-approach/)
