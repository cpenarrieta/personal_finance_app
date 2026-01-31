# Personal Finance App

Personal finance tracker. Next.js 16 + Convex + Plaid + shadcn/ui.

**Note:** Built for single-user personal use. No multi-tenancy—all data is shared across the app, not separated by user.

## Features

- Bank/investment sync via Plaid
- Transaction management with split transactions and custom tags
- Investment portfolio tracking (holdings, cost basis, gains)
- Spending analytics and charts
- Multi-account support
- LLM chat to query transactions (natural language)

## Tech Stack

- Next.js 16 (App Router), TypeScript, React 19
- Convex (real-time backend)
- Better Auth (Google/GitHub OAuth)
- Plaid API (banking data)
- Tailwind CSS 4, shadcn/ui, Recharts

## Setup

### Prerequisites

- Node.js 18+
- Convex account
- Plaid account
- Google/GitHub OAuth apps

### Install

```bash
git clone https://github.com/cpenarrieta/personal_finance_app.git
cd personal_finance_app
npm install
npx convex dev  # creates .env.local
```

### Environment Variables

Add to `.env.local`:

```bash
PLAID_CLIENT_ID="..."
PLAID_SECRET="..."
PLAID_ENV="sandbox"
OPENAI_API_KEY="..."        # optional
```

Set Convex env vars:

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3000
npx convex env set ALLOWED_EMAILS "your@email.com"
npx convex env set GOOGLE_CLIENT_ID "..."
npx convex env set GOOGLE_CLIENT_SECRET "..."
npx convex env set GITHUB_CLIENT_ID "..."
npx convex env set GITHUB_CLIENT_SECRET "..."
```

### Run

```bash
# Terminal 1
npx convex dev

# Terminal 2
npm run build && npm start
```

Open http://localhost:3000

### OAuth Setup

- Google: [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
  - Redirect: `http://localhost:3000/api/auth/callback/google`
- GitHub: [github.com/settings/developers](https://github.com/settings/developers)
  - Callback: `http://localhost:3000/api/auth/callback/github`

### Sync Data

```bash
npm run sync        # incremental
npm run sync:fresh  # full
```

## Scripts

```bash
npm run build        # build
npm run lint         # lint
npm run type-check   # typecheck
npm run sync         # sync plaid data
npx convex dev       # convex dev server
npx convex deploy    # deploy convex
```

## Docs

- [CLAUDE.md](./CLAUDE.md) - dev rules
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - schema, structure
- [docs/DATA_FETCHING.md](./docs/DATA_FETCHING.md) - data patterns
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) - commands
- [AUTH_SETUP.md](./AUTH_SETUP.md) - auth guide

## Contributing

PRs welcome. Follow patterns in CLAUDE.md and docs/. Use shadcn/ui, TypeScript strict mode.

## License

CC BY-NC 4.0 - Non-commercial use only. See [LICENSE](./LICENSE).
