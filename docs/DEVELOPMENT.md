# Development Guide

## Commands

```bash
# Development (dev server always running - NEVER run npm run dev)
npm run build        # Production build with Turbopack
npm start            # Start production server
npm run lint         # ESLint

# Database (ALWAYS use migrate dev, NEVER db push)
npx prisma migrate dev --name description  # Create & apply migration
npx prisma generate                        # Generate Prisma Client
npx prisma studio                          # Database GUI

# Plaid Sync
npm run sync                    # Incremental sync
```

## Environment (.env)

**Required:**
- `DATABASE_URL`: PostgreSQL connection
- `BETTER_AUTH_SECRET`: Random secret
- `BETTER_AUTH_URL`: App URL (e.g., http://localhost:3000)
- `ALLOWED_EMAILS`: Comma-separated emails for access
- OAuth: Google and/or GitHub credentials
- Plaid: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`

**Optional:**
- `OPENAI_API_KEY`: AI categorization
- `ALPHA_VANTAGE_API_KEY`: Stock prices

## Debugging

- **Database**: `npx prisma studio`
- **Sync cursors**: Check Item table for `lastTransactionsCursor`, `lastInvestmentsCursor`
- **Logs**: Sync shows per-item statistics

## Authentication

- Email-gated via `ALLOWED_EMAILS` in `.env`
- Better Auth with OAuth (Google/GitHub)
- Enforced in `src/proxy.ts` (Next.js 16)
- Protected: All routes except `/login` and `/api/auth/*`

## Next.js 16 Patterns

- **Async params**: Always `await params` in page components
- **Caching**: Use `"use cache"` with `cacheLife()` and `cacheTag()`
- **Server Components**: Default (use `'use client'` only for interactivity)
- **Generated columns**: Use for client data (`amount_number`, `date_string`)
