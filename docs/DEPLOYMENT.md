# Deployment Guide - Vercel

## Prerequisites

- Convex account and deployment
- API keys: Plaid, Google/GitHub OAuth, OpenAI (optional), Alpha Vantage (optional)
- [Vercel account](https://vercel.com/signup)

## Step 1: Convex Setup

1. Create a Convex project at [dashboard.convex.dev](https://dashboard.convex.dev)
2. Deploy: `npx convex deploy`
3. Copy your `CONVEX_DEPLOY_KEY` from the dashboard

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
CONVEX_DEPLOY_KEY=prod:...
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

## Step 4: Verify

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
| Type errors | Run `npm run type-check` locally |
| ALLOWED_EMAILS error | Add env var, redeploy |
| Convex connection | Verify CONVEX_DEPLOY_KEY |
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
- [ ] Plaid webhook verification for production
