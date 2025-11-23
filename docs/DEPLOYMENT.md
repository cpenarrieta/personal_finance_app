# Deployment Guide - Vercel

This guide covers deploying the Personal Finance App to Vercel.

## Prerequisites

Before deploying, ensure you have:

1. ✅ **PostgreSQL Database** - Use a hosted provider like:
   - [Vercel Postgres](https://vercel.com/storage/postgres)
   - [Neon](https://neon.tech/)
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)

2. ✅ **API Keys** - Have all required API credentials ready:
   - Plaid API credentials
   - Google OAuth credentials
   - GitHub OAuth credentials
   - OpenAI API key (optional)
   - Alpha Vantage API key (optional)

3. ✅ **Vercel Account** - [Sign up at vercel.com](https://vercel.com/signup)

## Step 1: Database Setup

### Option A: Vercel Postgres (Recommended)

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Copy the `DATABASE_URL` connection string (with pooling enabled)

### Option B: External Database Provider

1. Create a PostgreSQL database on your chosen provider
2. Copy the connection string (should start with `postgresql://`)
3. Ensure the database is accessible from the internet

## Step 2: OAuth Configuration

Update your OAuth redirect URIs for production:

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Edit your OAuth App
3. Update **Authorization callback URL**:
   ```
   https://your-app.vercel.app/api/auth/callback/github
   ```

## Step 3: Deploy to Vercel

### Via Vercel Dashboard (Recommended for first deploy)

1. **Connect Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Select the repository

2. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

3. **Add Environment Variables** (see below)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (3-5 minutes)

### Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Step 4: Environment Variables

Add these environment variables in Vercel dashboard under **Settings** → **Environment Variables**:

### Required Variables

```bash
# Database (from Step 1)
DATABASE_URL=postgresql://user:password@host:5432/database

# Better Auth Configuration
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=https://your-app.vercel.app

# Allowed User Email (REQUIRED)
ALLOWED_EMAILS=your-email@gmail.com

# Google OAuth (from Step 2)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (from Step 2)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Plaid API
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=development  # or 'production' for live data
PLAID_PRODUCTS=auth,transactions,investments
PLAID_COUNTRY_CODES=US,CA
```

### Optional Variables

```bash
# OpenAI API (for AI categorization)
OPENAI_API_KEY=your-openai-api-key

# Alpha Vantage API (for stock prices)
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
```

**Important Notes:**
- Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
- Update `BETTER_AUTH_URL` to your Vercel app URL (e.g., `https://your-app.vercel.app`)
- For multiple allowed emails, separate with commas: `email1@gmail.com,email2@gmail.com`

## Step 5: Run Database Migrations

After your first successful deployment:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Link your project**:
   ```bash
   vercel link
   ```

3. **Pull environment variables**:
   ```bash
   vercel env pull .env.local
   ```

4. **Run migrations on production database**:
   ```bash
   npx prisma migrate deploy
   ```

   Or connect directly to your Vercel Postgres database:
   ```bash
   # In Vercel dashboard, copy the DATABASE_URL
   # Then run:
   DATABASE_URL="your-production-db-url" npx prisma migrate deploy
   ```

**Alternative: Use Vercel's PostgreSQL migration feature**
- If using Vercel Postgres, migrations can run automatically via the dashboard

## Step 6: Verify Deployment

1. **Visit your app**: `https://your-app.vercel.app`
2. **Test authentication**: Log in with allowed email
3. **Connect Plaid**: Link a bank account (use Sandbox if in development mode)
4. **Test sync**: Ensure data syncs correctly

## Plaid Webhook Setup (Recommended)

For real-time transaction updates via webhooks:

1. **Get your webhook URL**: `https://your-app.vercel.app/api/webhooks/plaid`

2. **Configure in Plaid Dashboard**:
   - Go to [Plaid Dashboard](https://dashboard.plaid.com/team/webhooks)
   - Add webhook URL: `https://your-app.vercel.app/api/webhooks/plaid`

3. **Redeploy** for changes to take effect

See [WEBHOOKS.md](./WEBHOOKS.md) for detailed webhook documentation.

## Troubleshooting

### Build Fails

**Error: Prisma Client not generated**
- ✅ Fixed by `postinstall` script in `package.json`
- Vercel runs `npm install` → triggers `prisma generate` automatically

**Error: Type errors during build**
- Run locally: `npm run type-check`
- Fix all TypeScript errors before deploying

### Runtime Errors

**"ALLOWED_EMAILS not configured"**
- Add `ALLOWED_EMAILS` environment variable in Vercel dashboard
- Redeploy after adding

**Database connection issues**
- Verify `DATABASE_URL` is correct
- Ensure database is accessible from Vercel (check IP allowlist if applicable)
- For Vercel Postgres, use the pooling connection string

**OAuth redirect mismatch**
- Verify OAuth redirect URIs match your Vercel URL exactly
- Check both Google and GitHub OAuth app settings

### Performance Issues

**Slow page loads**
- Enable [Vercel Analytics](https://vercel.com/docs/analytics)
- Check database query performance
- Consider using Prisma Accelerate for connection pooling

## Continuous Deployment

Vercel automatically deploys on every push to your main branch:

- **Main branch** → Production deployment
- **Other branches** → Preview deployments
- **Pull requests** → Automatic preview URLs

## Environment-Specific Configurations

### Development vs Production

Use Vercel's environment scopes:
- **Production**: Main branch deployments
- **Preview**: Branch and PR deployments
- **Development**: Local development (`.env.local`)

You can set different values for `PLAID_ENV`, etc.:
- Production: `PLAID_ENV=production` (live banking data)
- Preview/Dev: `PLAID_ENV=sandbox` (test data)

## Security Checklist

Before going live:

- ✅ Strong `BETTER_AUTH_SECRET` (minimum 32 characters)
- ✅ `ALLOWED_EMAILS` properly configured
- ✅ OAuth secrets not exposed in client-side code
- ✅ Database connection string uses SSL (included in Vercel Postgres)
- ✅ Plaid webhook secret configured for production
- ✅ All API keys are production-grade (not development/sandbox)

## Cost Considerations

### Vercel
- **Hobby Plan**: Free (good for personal use)
- **Pro Plan**: $20/month (needed for password-protected deployments, more build time)

### Database
- **Vercel Postgres**: $0.24/GB storage + compute
- **Neon**: Free tier available (0.5GB storage)
- **Supabase**: Free tier available (500MB storage)

### APIs
- **Plaid**: Development free, Production pricing varies
- **OpenAI**: Pay per use (~$0.001 per categorization)
- **Alpha Vantage**: Free tier (5 requests/min)

## Post-Deployment

### Regular Maintenance

1. **Monitor logs**: Check Vercel dashboard for errors
2. **Update dependencies**: `npm update` monthly
3. **Backup database**: Regular automated backups
4. **Sync data**: Run `npm run sync` manually or via cron job

### Adding a Cron Job (Vercel Cron)

To auto-sync data daily:

1. Create `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/sync",
       "schedule": "0 6 * * *"
     }]
   }
   ```

2. Create API route `app/api/cron/sync/route.ts`

See [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) for details.

## Support

- **Vercel Issues**: [Vercel Support](https://vercel.com/support)
- **Plaid Issues**: [Plaid Support](https://dashboard.plaid.com/support)
- **App Issues**: Open an issue on GitHub

---

**Congratulations!** Your Personal Finance App is now deployed on Vercel. 🎉
