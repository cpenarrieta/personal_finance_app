# Deployment Guide - Vercel

## Prerequisites

- PostgreSQL database (Vercel Postgres, Neon, Supabase, Railway)
- API keys: Plaid, Google/GitHub OAuth, OpenAI (optional), Alpha Vantage (optional)
- [Vercel account](https://vercel.com/signup)

## Step 1: Database

**Vercel Postgres**: Project dashboard → Storage → Create Database → Postgres → Copy `DATABASE_URL`

**External**: Create PostgreSQL database, copy connection string.

## Step 2: OAuth Redirect URIs

Update for production:

**Google** ([Cloud Console](https://console.cloud.google.com/apis/credentials)):
```
https://your-app.vercel.app/api/auth/callback/google
```

**GitHub** ([Developer Settings](https://github.com/settings/developers)):
```
https://your-app.vercel.app/api/auth/callback/github
```

## Step 3: Deploy

1. [vercel.com/new](https://vercel.com/new) → Import repository
2. Add environment variables (see below)
3. Deploy

Or via CLI:
```bash
npm i -g vercel && vercel login && vercel --prod
```

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://your-app.vercel.app
ALLOWED_EMAILS=your-email@gmail.com

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Plaid
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=development
PLAID_PRODUCTS=auth,transactions,investments
PLAID_COUNTRY_CODES=US,CA
```

### Optional
```bash
OPENAI_API_KEY=...           # AI categorization
ALPHA_VANTAGE_API_KEY=...    # Stock prices
```

## Step 4: Run Migrations

```bash
vercel link
vercel env pull .env.local
npx prisma migrate deploy
```

## Step 5: Verify

1. Visit `https://your-app.vercel.app`
2. Log in with allowed email
3. Connect Plaid account
4. Test sync

## Webhooks (Recommended)

Add in [Plaid Dashboard](https://dashboard.plaid.com/team/webhooks):
```
https://your-app.vercel.app/api/plaid/webhook
```

See [WEBHOOKS.md](./WEBHOOKS.md).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Prisma not generated | Fixed by `postinstall` script |
| Type errors | Run `npm run type-check` locally |
| ALLOWED_EMAILS error | Add env var, redeploy |
| DB connection | Verify URL, check IP allowlist |
| OAuth mismatch | Update redirect URIs exactly |

## Cron Job (Optional)

Auto-sync daily:

`vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/sync",
    "schedule": "0 6 * * *"
  }]
}
```

## Security Checklist

- [ ] Strong `BETTER_AUTH_SECRET` (32+ chars)
- [ ] `ALLOWED_EMAILS` configured
- [ ] OAuth secrets not exposed
- [ ] Database SSL enabled
- [ ] Plaid webhook verification for production
