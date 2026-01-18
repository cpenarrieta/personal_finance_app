# Development Guide

## Commands

```bash
# Development (dev server always running - NEVER run npm run dev)
npm run build        # Production build with Turbopack
npm start            # Start production server
npm run lint         # ESLint

# Convex
npx convex dev       # Start Convex dev server (run in separate terminal)
npx convex deploy    # Deploy Convex to production

# Plaid Sync
npm run sync         # Incremental sync
```

## Environment (.env)

**Required:**
- `CONVEX_DEPLOYMENT`: Convex deployment URL
- `NEXT_PUBLIC_CONVEX_URL`: Convex public URL
- `DATABASE_URL`: PostgreSQL connection (for auth only)
- `BETTER_AUTH_SECRET`: Random secret
- `BETTER_AUTH_URL`: App URL (e.g., http://localhost:3000)
- `ALLOWED_EMAILS`: Comma-separated emails for access
- OAuth: Google and/or GitHub credentials
- Plaid: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`

**Optional:**
- `OPENAI_API_KEY`: AI categorization
- `ALPHA_VANTAGE_API_KEY`: Stock prices
- `PLAID_WEBHOOK_VERIFICATION_KEY`: Webhook security (recommended for production)

## Debugging

- **Convex Dashboard**: `npx convex dashboard` or visit dashboard.convex.dev
- **Sync cursors**: Check items table for `lastTransactionsCursor`, `lastInvestmentsCursor`
- **Logs**: Sync shows per-item statistics

## Authentication

- Email-gated via `ALLOWED_EMAILS` in `.env`
- Better Auth with OAuth (Google/GitHub)
- Enforced in `src/proxy.ts` (Next.js 16)
- Protected: All routes except `/login` and `/api/auth/*`
- **Note**: Auth uses Prisma/PostgreSQL, all other data uses Convex

## Next.js 16 Patterns

- **Async params**: Always `await params` in page components
- **Server Components**: Default (use `'use client'` only for interactivity)
- **Convex in Server Components**: Use `fetchQuery` from `convex/nextjs`
- **Convex in Client Components**: Use `useQuery`/`useMutation` from `convex/react`
