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

## Environment

### Local (.env.local)
- `CONVEX_DEPLOYMENT`: Convex deployment URL
- `NEXT_PUBLIC_CONVEX_URL`: Convex public URL (e.g., https://adjective-animal-123.convex.cloud)
- `NEXT_PUBLIC_CONVEX_SITE_URL`: Convex site URL (e.g., https://adjective-animal-123.convex.site)
- Plaid: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`

### Convex Environment (set via `npx convex env set`)
- `BETTER_AUTH_SECRET`: Random secret (`openssl rand -base64 32`)
- `SITE_URL`: Your app URL (e.g., http://localhost:3000)
- `ALLOWED_EMAILS`: Comma-separated emails for access
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: GitHub OAuth

### Optional
- `OPENAI_API_KEY`: AI categorization (local .env)
- `ALPHA_VANTAGE_API_KEY`: Stock prices (local .env)
- `PLAID_WEBHOOK_VERIFICATION_KEY`: Webhook security (Convex env)

## Debugging

- **Convex Dashboard**: `npx convex dashboard` or visit dashboard.convex.dev
- **Sync cursors**: Check items table for `lastTransactionsCursor`, `lastInvestmentsCursor`
- **Logs**: Sync shows per-item statistics

## Authentication

- **Better Auth** with Convex adapter - OAuth (Google/GitHub)
- Email-gated via `ALLOWED_EMAILS` Convex env var
- Enforced in `src/proxy.ts` (Next.js 16) and `convex/auth.ts`
- Protected: All routes except `/login` and `/api/auth/*`
- **All auth data stored in Convex** (users, sessions, accounts)

### OAuth Redirect URIs
Configure in Google Cloud Console / GitHub Developer Settings:
- Development: `http://localhost:3000/api/auth/callback/google` (or `/github`)
- Production: `https://your-domain.com/api/auth/callback/google` (or `/github`)

## Next.js 16 Patterns

- **Async params**: Always `await params` in page components
- **Server Components**: Default (use `'use client'` only for interactivity)
- **Convex in Server Components**: Use `fetchQuery` from `convex/nextjs`
- **Convex in Client Components**: Use `useQuery`/`useMutation` from `convex/react`
