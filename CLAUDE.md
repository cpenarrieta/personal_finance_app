# CLAUDE.md

Personal finance app: Next.js 16 + Convex + Plaid + shadcn/ui.

## Critical Rules

1. **Data**: Convex only. `fetchQuery` (server), `useQuery` (client). No fetch API.
2. **Colors**: shadcn theme variables only. No hardcoded Tailwind colors.
3. **Components**: shadcn/ui for all UI. Exception: native `<select>` with `<optgroup>`.
4. **Params**: Always `await params` (Next.js 16 async).
5. **Dev server**: Never run `npm run dev`. Convex: `npx convex dev` in separate terminal.

## Docs

- [Data Fetching](docs/DATA_FETCHING.md) - Convex patterns, server/client examples
- [Theming](docs/THEMING.md) - Color mappings, semantic variables
- [Architecture](docs/ARCHITECTURE.md) - Schema, project structure, sync, auth
- [Development](docs/DEVELOPMENT.md) - Commands, env vars, debugging
