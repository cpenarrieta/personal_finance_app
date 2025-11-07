# Development Guide

## Development Commands

### Running the App
```bash
npm run dev          # Never run this command, I will always have this running locally in a separate tab
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
```

### Transaction Categorization
```bash
npm run categorize:gpt          # AI-powered categorization using OpenAI, NEVER run this command
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Random secret for auth
- `BETTER_AUTH_URL`: App URL (e.g., http://localhost:3000)
- `ALLOWED_EMAILS`: Multiple email addresses allowed to access the app (email-gated access)
- OAuth credentials (Google and/or GitHub)
- Plaid API credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`)

**Optional:**
- `OPENAI_API_KEY`: For AI-powered transaction categorization
- `ALPHA_VANTAGE_API_KEY`: For stock price updates

## Testing & Debugging

- Use Prisma Studio to inspect database: `npx prisma studio`
- Check Plaid webhook logs and transaction sync cursor values in Item table
- For sync issues: Run `npm run sync:fresh` to clear and re-sync all data
- View detailed sync logs in terminal output (shows per-item and total statistics)

## Authentication & Security

- Single-user app: Only `ALLOWED_EMAILS` emails can access (configured in .env)
- Email validation happens in `src/lib/auth-helpers.ts` during auth callbacks
- Session-based auth with cookies (`better-auth.session_token`)
- All pages except `/login` and `/api/auth/*` require authentication

## Component Patterns

- Server Components by default (use `'use client'` only when needed)
- Client components: Forms, interactive elements, Plaid Link, modals
- shadcn/ui components in `src/components/ui/`
- Use `cn()` utility from `src/lib/utils.ts` for conditional Tailwind classes

## Type Safety

- Strict TypeScript config with all strict flags enabled
- Use `@/*` path alias for imports (configured in tsconfig.json)
- Prisma types: Import from `@prisma/client` or use types from `src/types/`
- Use `Prisma.Decimal` for monetary amounts (not `number`)
