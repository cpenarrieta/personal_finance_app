# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal finance application built with Next.js 15 (App Router) that integrates with Plaid API to sync financial data (transactions, accounts, investments). Features include transaction categorization (including AI-powered categorization with OpenAI), investment portfolio tracking, custom tags, split transactions, and analytics visualization.

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript (strict mode with comprehensive type checking enabled)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Better Auth with OAuth (Google, GitHub)
- **Financial Data**: Plaid API for banking/investment data
- **AI**: OpenAI GPT-4o-mini for transaction categorization
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components, Recharts for visualization
- **Stock Data**: Alpha Vantage API for pricing

## Development Commands

### Running the App
```bash
npm run dev          # Never run this command, I will always have this running locally in a separate tab
npm run build        # Build for production with Turbopack
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database Operations
```bash
npx prisma migrate dev          # Create and apply migrations
npx prisma generate             # Generate Prisma Client after schema changes
npx prisma studio               # Open Prisma Studio database GUI
```

### Financial Data Sync Scripts
```bash
npm run sync                    # Incremental sync (uses cursors to fetch only new data)
```

### Transaction Categorization
```bash
npm run categorize:gpt          # AI-powered categorization using OpenAI, NEVER run this command
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Random secret for auth
- `BETTER_AUTH_URL`: App URL (e.g., http://localhost:3000)
- `ALLOWED_EMAIL`: Single email address allowed to access the app (email-gated access)
- OAuth credentials (Google and/or GitHub)
- Plaid API credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`)

**Optional:**
- `OPENAI_API_KEY`: For AI-powered transaction categorization
- `ALPHA_VANTAGE_API_KEY`: For stock price updates

## Architecture

### Data Flow

1. **Plaid Integration** (`src/lib/plaid.ts`, `src/lib/sync.ts`):
   - Items (bank connections) → Accounts → Transactions/Holdings
   - Uses Plaid's `/transactions/sync` endpoint for incremental banking transaction updates
   - First sync fetches historical data from 2024-01-01
   - Investment data: Holdings snapshot + Investment transactions from 2024-01-01
   - Sync preserves user customizations (account names, custom prices)

2. **Authentication** (`src/lib/auth.ts`, `src/middleware.ts`):
   - Better Auth handles OAuth (Google/GitHub)
   - Email-gated: Only `ALLOWED_EMAIL` can access (enforced in `src/lib/auth-helpers.ts`)
   - Middleware redirects unauthenticated users to `/login`
   - Protected routes: All except `/login` and `/api/auth/*`

3. **Database Schema** (`prisma/schema.prisma`):
   - **Plaid entities**: Institution → Item → PlaidAccount → Transaction
   - **Investment entities**: Security, Holding, InvestmentTransaction
   - **Custom categorization**: CustomCategory ↔ CustomSubcategory ← Transaction
   - **Organization**: CategoryGroup (for grouping categories), Tag (many-to-many with transactions)
   - **Split transactions**: Parent-child relationship with `isSplit`, `parentTransactionId`, `originalTransactionId`
   - **Auth models**: User, Session, Account, Verification (Better Auth)

4. **Transaction Categorization**:
   - Plaid provides base categories (`category`, `subcategory` fields)
   - Users can override with custom categories (`customCategoryId`, `customSubcategoryId`)
   - Rule-based auto-categorization: `scripts/auto-categorize.ts`
   - AI-powered categorization: `scripts/auto-categorize-gpt.ts` (batches of 20, uses GPT-4o-mini, considers notes/merchant/Plaid categories)

### Key Features

- **Split Transactions**: A transaction can be split into multiple child transactions with different categories. Parent is marked `isSplit: true` and hidden from normal views. Children reference `parentTransactionId` and `originalTransactionId`.
- **Investment Tracking**: Holdings show current quantity, cost basis, institution price. Investment transactions track buys/sells/dividends.
- **Custom Account Names**: Sync preserves user-renamed accounts (doesn't overwrite `name` field).
- **Custom Prices**: Sync preserves manually-set holding prices if Plaid returns 0 or null.
- **Tags**: Many-to-many relationship for flexible transaction labeling.

### Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── auth/[...all]/        # Better Auth catch-all
│   │   ├── plaid/                # Plaid integration (create link token, sync, exchange token)
│   │   ├── transactions/         # CRUD, bulk update, split
│   │   ├── categorize/           # Single transaction categorization
│   │   ├── categorize-all/       # Bulk categorization
│   │   ├── tags/                 # Tag management
│   │   └── custom-categories/    # Category CRUD
│   ├── accounts/                 # Account list and detail pages
│   ├── transactions/             # Transaction list and detail pages
│   ├── investments/              # Holdings and investment transactions
│   ├── analytics/                # Analytics dashboard
│   ├── charts/                   # Data visualization
│   ├── settings/                 # Category/tag management, move transactions
│   └── login/                    # Login page
├── components/                   # React components (UI, forms, lists)
├── lib/                          # Utilities and core logic
│   ├── auth.ts                   # Better Auth configuration
│   ├── auth-helpers.ts           # Email gating logic
│   ├── plaid.ts                  # Plaid client initialization
│   ├── sync.ts                   # Core sync logic
│   ├── syncPrices.ts             # Stock price updates via Alpha Vantage
│   ├── prisma.ts                 # Prisma client singleton
│   └── utils.ts                  # Utility functions (cn, etc.)
├── types/                        # TypeScript type definitions
└── middleware.ts                 # Auth middleware
scripts/                          # Standalone scripts (sync, categorization)
prisma/                           # Prisma schema and migrations
```

## Important Patterns

### API Routes
- All API routes use Next.js App Router conventions (route.ts files)
- Use `prisma` from `src/lib/prisma.ts` (singleton pattern)
- Auth checking: Import from `src/lib/auth-helpers.ts`, use `requireAuth()` helper
- Return `NextResponse.json()` for JSON responses

### Type Safety
- Strict TypeScript config with all strict flags enabled
- Use `@/*` path alias for imports (configured in tsconfig.json)
- Prisma types: Import from `@prisma/client` or use types from `src/types/prisma.ts`
- Use `Prisma.Decimal` for monetary amounts (not `number`)

### Sync Behavior
- Incremental sync uses cursors (`lastTransactionsCursor`, `lastInvestmentsCursor`)
- Historical data fetched on first sync (when no cursor exists)
- Account balances updated on every sync
- Holdings are snapshot-based (deleted if no longer in Plaid response)
- Sync preserves: user-renamed accounts, custom holding prices (when Plaid returns 0)

### Component Patterns
- Server Components by default (use `'use client'` only when needed)
- Client components: Forms, interactive elements, Plaid Link, modals
- shadcn/ui components in `src/components/ui/`
- Use `cn()` utility from `src/lib/utils.ts` for conditional Tailwind classes

## Data Fetching Strategy

### Overview
This app uses **Next.js 15 Server Components** for data fetching, following a "fetch once, pass down" pattern. Data is fetched on the server using Prisma and passed as props through the component tree.

### Key Principles

1. **Server-Side Fetching**: Fetch data in Server Components (page.tsx files) using Prisma
2. **No Client-Side API Calls**: Avoid fetching categories, tags, or other static/reference data from client components
3. **Props Over Context**: Pass data through props instead of using React Context
4. **Parallel Fetching**: Use `Promise.all()` to fetch multiple datasets in parallel

### Implementation Pattern

#### Server Component (Page)
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

#### Client Component
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

### Common Reference Data

The following data should be fetched server-side and passed as props:

- **Categories**: `prisma.customCategory.findMany()` with subcategories included
- **Tags**: `prisma.tag.findMany()`
- **Accounts**: `prisma.plaidAccount.findMany()` when needed for dropdowns

### Pages Using This Pattern

✅ **Implemented:**
- `/transactions` - Fetches transactions, categories, tags
- `/accounts/[id]` - Fetches transactions, categories, tags for a specific account
- `/transactions/[id]` - Fetches single transaction, categories, tags

### Components Receiving Reference Data

The following components **require** categories/tags as props (do NOT fetch internally):

- `SearchableTransactionList` - needs categories and tags
- `EditTransactionModal` - needs categories and tags
- `SplitTransactionModal` - needs categories
- `TransactionDetailView` - needs categories and tags (passes to modals)

### Benefits of This Approach

1. **Performance**: Data fetched once on the server, not on every modal open
2. **Caching**: Next.js automatically caches server component data
3. **No Loading States**: Client components render immediately with data
4. **Type Safety**: Full TypeScript support with serialized types
5. **Reduced API Calls**: No `/api/custom-categories` or `/api/tags` calls from client

### When to Use Client-Side Fetching

**Only use client-side API calls for:**
- User actions that modify data (POST, PATCH, DELETE)
- Real-time data that needs to refresh
- Conditional data loading based on user interaction

**Never use client-side fetching for:**
- Categories (static reference data)
- Tags (static reference data)  
- Initial page data (use server components)

### Type Definitions

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

### Serialization Guidelines

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

### Migration Checklist

When adding a new page or component that needs reference data:

1. ✅ Fetch categories/tags in the Server Component (page.tsx)
2. ✅ Serialize the data (convert Dates to ISO strings)
3. ✅ Pass as props to Client Components
4. ✅ Update TypeScript interfaces in `types/components.ts`
5. ✅ Remove any `useEffect` fetching from client components
6. ✅ Remove `/api/custom-categories` and `/api/tags` calls

## Testing & Debugging

- Use Prisma Studio to inspect database: `npx prisma studio`
- Check Plaid webhook logs and transaction sync cursor values in Item table
- For sync issues: Run `npm run sync:fresh` to clear and re-sync all data
- View detailed sync logs in terminal output (shows per-item and total statistics)

## Authentication & Security

- Single-user app: Only `ALLOWED_EMAIL` can access (configured in .env)
- Email validation happens in `src/lib/auth-helpers.ts` during auth callbacks
- Session-based auth with cookies (`better-auth.session_token`)
- All pages except `/login` and `/api/auth/*` require authentication

## AI Categorization Details

- Uses OpenAI GPT-4o-mini with JSON response format
- Processes transactions in batches of 20 (to avoid token limits)
- Considers: transaction name, merchant, amount (income vs expense), Plaid categories, user notes
- Only assigns categories with >50% confidence
- Preserves existing user categorizations unless re-run with `recategorize:all`
