# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

📖 **Detailed Documentation:**

- [Data Fetching Strategy](docs/DATA_FETCHING.md) - Convex queries, Server/Client patterns
- [Theming Guidelines](docs/THEMING.md) - shadcn/ui theme variables, NO hardcoded colors
- [Architecture](docs/ARCHITECTURE.md) - Database schema, Plaid sync, project structure
- [Development Guide](docs/DEVELOPMENT.md) - Commands, environment setup
- [Webhooks Guide](docs/WEBHOOKS.md) - Plaid webhook setup for real-time transaction sync

## Project Overview

Personal finance app built with Next.js 16 that syncs financial data via Plaid API. Features: transaction categorization (AI-powered with OpenAI), investment tracking, custom tags, split transactions, and analytics.

## Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack (stable)
- **Language**: TypeScript (strict mode)
- **Database**: Convex (real-time backend)
- **Authentication**: Better Auth with OAuth (Google, GitHub) - uses Prisma for auth tables only
- **Financial Data**: Plaid API
- **AI**: OpenAI GPT-5-mini for transaction categorization
- **UI**: React 19.2, Tailwind CSS 4, shadcn/ui, Recharts
- **Stock Data**: Alpha Vantage API

## Critical Development Rules

### 1. Data Fetching Pattern ⭐️ MOST IMPORTANT

**Use Convex queries/mutations. Server Components use `fetchQuery`, Client Components use `useQuery`.**

```typescript
// ✅ DO: Server Component with Convex
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export default async function Page() {
  const transactions = await fetchQuery(api.transactions.getAll)
  return <ClientComponent transactions={transactions} />
}

// ✅ DO: Client Component with real-time updates
'use client'
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function ClientComponent() {
  const transactions = useQuery(api.transactions.getAll)
  // Real-time updates automatically
}

// ❌ DON'T: fetch API calls
fetch('/api/transactions')  // NO!
```

👉 See [DATA_FETCHING.md](docs/DATA_FETCHING.md) for details

### 2. Theming ⭐️ NO HARDCODED COLORS

**Use shadcn/ui theme variables exclusively. Never hardcode Tailwind colors.**

```typescript
// ✅ DO
<div className="bg-background text-foreground">
  <p className="text-muted-foreground">Description</p>
  <Button variant="default">Action</Button>
</div>

// ❌ DON'T
<div className="bg-gray-50 text-gray-900">
  <p className="text-gray-600">Description</p>
  <button className="bg-blue-600">Action</button>
</div>
```

**Quick reference:** `text-gray-900` → `text-foreground` | `text-gray-600` → `text-muted-foreground` | `bg-gray-50` → `bg-background` | `text-blue-600` → `text-primary`

**Exceptions:** User-defined colors (tags), chart colors only.

👉 See [THEMING.md](docs/THEMING.md) for full guide

### 3. UI Components ⭐️ USE shadcn/ui

**Use shadcn/ui components for all UI elements.**

```typescript
// ✅ DO
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>

// ❌ DON'T
<input type="text" />
```

**Available:** Input, Select, Label, Textarea, Button, Badge, Alert, Card, Dialog, Checkbox, Switch, Tabs, Table, Popover, Separator, RadioGroup, ScrollArea

**Exception:** Native `<select>` with `<optgroup>` (shadcn doesn't support optgroups)

**Install missing:** `npx shadcn@latest add [component-name]`

### 4. Next.js 16 Patterns

- **Async params**: Route `params` and `searchParams` are now `Promise` types - always `await` them
- **Server Components by default**: Use `'use client'` only for interactivity
- **proxy.ts**: Replaces middleware.ts (Edge runtime removed in Next.js 16)

```typescript
// Next.js 16: params are async
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Must await
}
```

### 5. Convex Patterns

- **Queries**: Read-only, use `query()` in convex/*.ts
- **Mutations**: Write operations, use `mutation()` in convex/*.ts
- **Schema**: Defined in `convex/schema.ts`
- **Generated types**: Auto-generated in `convex/_generated/`

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
  args: { id: v.id("transactions"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name })
  },
})
```

### 6. Type Safety

- Strict TypeScript mode
- Use `@/*` path alias
- Convex generates types automatically

## Common Tasks

### Adding a New Page

```typescript
// app/(app)/feature/page.tsx
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Async in Next.js 16
  const data = await fetchQuery(api.feature.getById, { id })

  return <ClientComponent data={data} />  // AppShell from layout
}
```

1. Create in `app/(app)/` - AppShell applied automatically via layout
2. Fetch data with Convex queries
3. Await `params` and `searchParams` (Next.js 16 requirement)
4. Pass data as props or use `useQuery` in Client Components
5. Add breadcrumb to `lib/breadcrumbs.ts` if needed

## Project Structure

```
src/
├── app/
│   ├── (app)/             # Authenticated pages (AppShell layout)
│   │   ├── layout.tsx     # Applies AppShell + breadcrumbs
│   │   ├── page.tsx       # Dashboard
│   │   ├── transactions/, accounts/, investments/, settings/
│   ├── api/               # API routes (Convex preferred)
│   ├── login/             # Public login page
│   └── layout.tsx         # Root layout (auth, theme)
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ...                # Feature components
├── lib/
│   ├── auth/              # Better Auth (still uses Prisma)
│   └── plaid.ts, sync/
└── types/
convex/
├── schema.ts              # Database schema
├── transactions.ts        # Transaction queries/mutations
├── accounts.ts            # Account queries/mutations
├── categories.ts          # Category queries/mutations
├── tags.ts                # Tag queries/mutations
├── investments.ts         # Investment queries/mutations
└── _generated/            # Auto-generated types
```

**Route groups:** `(app)` applies AppShell layout automatically. Don't wrap pages manually.

## Quick Commands

```bash
# Development (dev server always running locally - never run npm run dev)
npm run build              # Production build with Turbopack

# Convex
npx convex dev             # Start Convex dev server (run in separate terminal)
npx convex deploy          # Deploy to production

# Plaid Sync
npm run sync               # Sync financial data (incremental)
```

👉 See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for full details

## Authentication

Single-user app with email-gating. Only `ALLOWED_EMAILS` (env var) can access. Better Auth with OAuth (Google/GitHub). Auth enforced in `src/proxy.ts` (Next.js 16 - replaces middleware.ts).

**Note:** Auth still uses Prisma for its tables (User, Session, Account, Verification). All other data uses Convex.

## Important Rules

- **Never run** `npm run dev`
- **Convex dev**: Run `npx convex dev` in separate terminal during development
- **Async params**: Always `await params` in Next.js 16 pages
