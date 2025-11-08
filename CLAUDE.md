# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

📖 **Detailed Documentation:**

- [Data Fetching Strategy](docs/DATA_FETCHING.md) - Server Components, "use cache" directive, generated columns
- [Theming Guidelines](docs/THEMING.md) - shadcn/ui theme variables, NO hardcoded colors
- [Architecture](docs/ARCHITECTURE.md) - Database schema, Plaid sync, project structure
- [Development Guide](docs/DEVELOPMENT.md) - Commands, environment setup
- [Migrations Guide](docs/MIGRATIONS.md) - Prisma migration best practices
- [Webhooks Guide](docs/WEBHOOKS.md) - Plaid webhook setup for real-time transaction sync

## Project Overview

Personal finance app built with Next.js 16 that syncs financial data via Plaid API. Features: transaction categorization (AI-powered with OpenAI), investment tracking, custom tags, split transactions, and analytics.

## Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack (stable)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth with OAuth (Google, GitHub)
- **Financial Data**: Plaid API
- **AI**: OpenAI GPT-4o-mini for transaction categorization
- **UI**: React 19.2, Tailwind CSS 4, shadcn/ui, Recharts
- **Stock Data**: Alpha Vantage API

## Critical Development Rules

### 1. Data Fetching Pattern ⭐️ MOST IMPORTANT

**Fetch data in Server Components using cached queries from `@/lib/db/queries`. Pass data as props to Client Components.**

```typescript
// ✅ DO: Server Component with Next.js 16 "use cache" directive
import { getAllTransactions, getAllCategories, getAllTags } from "@/lib/db/queries"

export default async function Page() {
  const [transactions, categories, tags] = await Promise.all([
    getAllTransactions(),    // Cached 24h with cacheTag
    getAllCategories(),      // Cached 24h with cacheTag
    getAllTags(),           // Cached 24h with cacheTag
  ])

  return <ClientComponent transactions={transactions} categories={categories} tags={tags} />
}

// ❌ DON'T: Client-side fetching for reference data
'use client'
export function ClientComponent() {
  useEffect(() => {
    fetch('/api/categories')  // ❌ NO!
  }, [])
}
```

**Next.js 16 Caching**: All query functions use `"use cache"` directive with `cacheLife()` and `cacheTag()` for automatic invalidation.

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
- **"use cache" directive**: All data queries use Next.js 16 caching with `cacheLife()` and `cacheTag()`
- **proxy.ts**: Replaces middleware.ts (Edge runtime removed in Next.js 16)

```typescript
// Next.js 16: params are async
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Must await
}
```

### 5. Type Safety

- Strict TypeScript mode
- Use `@/*` path alias
- Generated columns for client data: `amount_number` (Float), `date_string` (String), etc.

## Common Tasks

### Adding a New Page

```typescript
// app/(app)/feature/page.tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Async in Next.js 16
  const data = await getAllSomeData()  // Cached query

  return <ClientComponent data={data} />  // AppShell from layout
}
```

1. Create in `app/(app)/` - AppShell applied automatically via layout
2. Fetch data with cached queries from `@/lib/db/queries`
3. Await `params` and `searchParams` (Next.js 16 requirement)
4. Pass data as props to Client Components
5. Add breadcrumb to `lib/breadcrumbs.ts` if needed

## Project Structure

```
src/
├── app/
│   ├── (app)/             # Authenticated pages (AppShell layout)
│   │   ├── layout.tsx     # Applies AppShell + breadcrumbs
│   │   ├── page.tsx       # Dashboard
│   │   ├── transactions/, accounts/, investments/, settings/
│   ├── api/               # API routes (Server Actions preferred)
│   ├── login/             # Public login page
│   └── layout.tsx         # Root layout (auth, theme)
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ...                # Feature components
├── lib/
│   ├── db/
│   │   ├── queries.ts     # Cached queries with "use cache"
│   │   └── prisma.ts      # Prisma client
│   ├── auth/              # Better Auth
│   └── plaid.ts, sync.ts
└── types/
```

**Route groups:** `(app)` applies AppShell layout automatically. Don't wrap pages manually.

## Quick Commands

```bash
# Development (dev server always running locally - never run npm run dev)
npm run build              # Production build with Turbopack

# Database - ALWAYS use migrate dev, NEVER db push
npx prisma migrate dev --name description  # Create & apply migration
npx prisma generate        # Generate Prisma Client
npx prisma studio          # Database GUI

# Plaid Sync
npm run sync               # Sync financial data (incremental)
```

👉 See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for full details

## Authentication

Single-user app with email-gating. Only `ALLOWED_EMAILS` (env var) can access. Better Auth with OAuth (Google/GitHub). Auth enforced in `src/proxy.ts` (Next.js 16 - replaces middleware.ts).

## Important Rules

- **Never run** `npm run dev` or `npm run categorize:gpt`
- **Migrations**: Use `migrate dev`, never `db push`. Always commit migration files
- **Caching**: Queries use Next.js 16 `"use cache"` with `cacheTag()` for invalidation
- **Async params**: Always `await params` in Next.js 16 pages
