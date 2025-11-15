# Architecture

## Data Flow

### 1. Plaid Integration
- **Endpoints**: `/transactions/sync` for incremental updates, `/investments/*` for holdings
- **First sync**: Historical data from 2024-01-01
- **Incremental**: Uses cursors (`lastTransactionsCursor`, `lastInvestmentsCursor`)
- **Preservation**: User-renamed accounts, custom holding prices
- **Location**: `src/lib/plaid.ts`, `src/lib/sync.ts`

### 2. Authentication (Next.js 16)
- **Better Auth** with OAuth (Google/GitHub)
- **Email-gating**: `ALLOWED_EMAILS` env var enforced in `src/proxy.ts` (replaces middleware.ts)
- **Protected**: All routes except `/login` and `/api/auth/*`

### 3. Database Schema
- **Plaid**: Institution → Item → PlaidAccount → Transaction
- **Investments**: Security, Holding, InvestmentTransaction
- **Categorization**: Category ↔ Subcategory ← Transaction
- **Tags**: Many-to-many with transactions
- **Split transactions**: Parent-child via `isSplit`, `parentTransactionId`, `originalTransactionId`
- **Auth**: User, Session, Account, Verification (Better Auth)

### 4. Transaction Categorization
- **Plaid categories**: Stored in `plaidCategory`, `plaidSubcategory` (reference only, not used)
- **Custom**: User assigns via `categoryId`, `subcategoryId`

## Key Features

- **Split Transactions**: Parent marked `isSplit: true`, children reference `parentTransactionId`
- **Investment Tracking**: Holdings (quantity, cost basis, price), investment transactions (buys/sells/dividends)
- **Custom Account Names**: Sync preserves user renames
- **Custom Prices**: Sync preserves manual prices when Plaid returns 0/null
- **Tags**: Many-to-many for flexible labeling

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated pages
│   │   ├── page.tsx              # Dashboard
│   │   ├── transactions/         # Transaction pages
│   │   ├── accounts/             # Account pages
│   │   ├── investments/          # Holdings, investment transactions
│   │   └── settings/             # Category/tag management
│   ├── api/                      # API routes (prefer Server Actions)
│   │   ├── auth/[...all]/        # Better Auth
│   │   ├── plaid/                # Plaid integration
│   │   ├── transactions/         # CRUD, bulk update
│   │   └── categories/, tags/    # Management
│   └── login/                    # Login page
├── components/                   # UI components
├── lib/
│   ├── db/
│   │   ├── queries.ts            # Cached queries ("use cache")
│   │   └── prisma.ts             # Prisma client
│   ├── auth/                     # Better Auth
│   ├── plaid.ts, sync.ts         # Plaid integration
│   └── syncPrices.ts             # Alpha Vantage
├── types/                        # TypeScript types
└── proxy.ts                      # Auth proxy (Next.js 16)
scripts/                          # Sync scripts
prisma/                           # Schema and migrations
```

## Technical Details

### Caching (Next.js 16)
- All queries use `"use cache"` directive with `cacheLife()` and `cacheTag()`
- Cached 24h, invalidated with `revalidateTag()`
- Location: `src/lib/db/queries.ts`

### Type Safety
- Strict TypeScript, `@/*` path alias
- Generated columns for client data: `amount_number` (Float), `date_string` (String)
- Server calculations use source: `amount` (Decimal), `date` (Date)

### Sync Behavior
- **Incremental**: Cursors (`lastTransactionsCursor`, `lastInvestmentsCursor`)
- **Historical**: First sync from 2024-01-01
- **Balances**: Updated every sync
- **Holdings**: Snapshot-based (deleted if not in Plaid response)
- **Preserves**: User renames, custom prices (when Plaid = 0)
