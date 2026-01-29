# Architecture

## Data Flow

### 1. Plaid Integration
- **Endpoints**: `/transactions/sync` for incremental updates, `/investments/*` for holdings
- **First sync**: Historical data from 2024-01-01
- **Incremental**: Uses cursors (`lastTransactionsCursor`, `lastInvestmentsCursor`)
- **Preservation**: User-renamed accounts, custom holding prices
- **Location**: `src/lib/plaid.ts`, `src/lib/sync/`

### 2. Authentication (Next.js 16)
- **Better Auth** with Convex adapter - OAuth (Google/GitHub) + Passkeys
- **Email-gating**: `ALLOWED_EMAILS` Convex env var enforced in `convex/auth.ts`
- **Protected**: All routes except `/login` and `/api/auth/*`
- **Proxy**: `src/proxy.ts` checks for Better Auth session cookie
- **Architecture**: `/api/auth/[...all]` proxies requests to Convex HTTP endpoints

### 3. Database Schema (Convex)
- **Plaid**: institutions → items → accounts → transactions
- **Investments**: securities, holdings, investmentTransactions
- **Categorization**: categories ↔ subcategories ← transactions
- **Tags**: Many-to-many via transactionTags junction table
- **Split transactions**: Parent-child via `isSplit`, `parentTransactionId`, `originalTransactionId`

### 4. Transaction Categorization
- **Plaid categories**: Stored in `plaidCategory`, `plaidSubcategory` (reference only, not used)
- **Custom**: User assigns via `categoryId`, `subcategoryId`

## Key Features

- **Split Transactions**: Parent marked `isSplit: true`, children reference `parentTransactionId`
- **Investment Tracking**: Holdings (quantity, cost basis, price), investment transactions (buys/sells/dividends)
- **Custom Account Names**: Sync preserves user renames
- **Custom Prices**: Sync preserves manual prices when Plaid returns 0/null
- **Tags**: Many-to-many for flexible labeling
- **Real-time Updates**: Convex provides automatic real-time sync

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
│   ├── api/                      # API routes (prefer Convex)
│   │   ├── auth/[...all]/        # Better Auth
│   │   └── plaid/                # Plaid integration
│   └── login/                    # Login page
├── components/                   # UI components
├── lib/
│   ├── auth/                     # Better Auth client & server utilities
│   ├── plaid.ts                  # Plaid client
│   ├── sync/                     # Sync logic
│   └── syncPrices.ts             # Alpha Vantage
├── types/                        # TypeScript types
└── proxy.ts                      # Auth proxy (Next.js 16)

convex/
├── schema.ts                     # Database schema
├── auth.ts                       # Better Auth instance with Convex adapter
├── auth.config.ts                # Auth provider config
├── convex.config.ts              # Convex app config (registers Better Auth component)
├── http.ts                       # HTTP routes (auth endpoints)
├── transactions.ts               # Transaction queries/mutations
├── accounts.ts                   # Account queries/mutations
├── categories.ts                 # Category queries/mutations
├── tags.ts                       # Tag queries/mutations
├── investments.ts                # Investment queries/mutations
├── dashboard.ts                  # Dashboard aggregations
└── _generated/                   # Auto-generated types

scripts/                          # Sync scripts
```

## Technical Details

### Convex
- Real-time backend with automatic subscriptions
- Queries for reads, mutations for writes
- Schema defined in `convex/schema.ts`
- Types auto-generated in `convex/_generated/`

### Type Safety
- Strict TypeScript, `@/*` path alias
- Convex generates types from schema
- Server calculations use source types directly

### Sync Behavior
- **Incremental**: Cursors (`lastTransactionsCursor`, `lastInvestmentsCursor`)
- **Historical**: First sync from 2024-01-01
- **Balances**: Updated every sync
- **Holdings**: Snapshot-based (deleted if not in Plaid response)
- **Preserves**: User renames, custom prices (when Plaid = 0)

### Running Sync

```bash
npm run sync    # Incremental sync of transactions + investments
```

Sync shows per-item statistics. Check `items` table for cursor values to debug.
