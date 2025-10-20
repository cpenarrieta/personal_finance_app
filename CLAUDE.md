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
npm run dev          # Start development server with Turbopack (http://localhost:3000)
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
npm run sync:fresh              # Full sync from scratch (deletes all data and re-syncs)
```

### Transaction Categorization
```bash
npm run categorize              # Auto-categorize using rule-based matching, never run this command
npm run categorize:gpt          # AI-powered categorization using OpenAI, never run this command
npm run recategorize:all        # Re-categorize all transactions, never run this command
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
