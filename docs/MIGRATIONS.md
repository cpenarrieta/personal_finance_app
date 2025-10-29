# Prisma Migrations Guide

## Quick Rules

| ✅ DO | ❌ DON'T |
|-------|----------|
| Use `prisma migrate dev` for all schema changes | Use `db push` on databases with real data |
| Commit migration files to git | Edit old migration files |
| Create manual migrations for fixes | Run SQL outside of migrations |
| Keep all migration folders forever | Delete migration folders |

## The Two Commands

### `npx prisma migrate dev` ⭐️ **USE THIS**
- Creates migration files with SQL
- Tracks history in database
- Reproducible across environments
- Safe for production

**Use for:**
- Any schema change in development
- Changes you want to track
- Changes going to production

### `npx prisma db push` ⚠️ **RARELY USE**
- No migration files created
- No history tracked
- Can be destructive

**Only use for:**
- Quick prototyping with throwaway data
- Never on production databases

## Standard Workflow

```bash
# 1. Edit prisma/schema.prisma
# Make your changes...

# 2. Create and apply migration
npx prisma migrate dev --name descriptive_change_name

# 3. Commit to git
git add prisma/migrations/
git commit -m "Migration: descriptive change name"

# 4. Generate Prisma Client (usually automatic)
npx prisma generate
```

## Manual Migrations (When Things Break)

If you need to fix something manually:

```bash
# 1. Create empty migration
npx prisma migrate dev --create-only --name fix_something

# 2. Edit the generated SQL file
# Edit: prisma/migrations/YYYYMMDDHHMMSS_fix_something/migration.sql

# 3. Apply it
npx prisma migrate dev
```

Or apply SQL directly then mark as resolved:

```bash
# 1. Execute SQL file
npx prisma db execute --file path/to/file.sql --schema prisma/schema.prisma

# 2. Mark migration as applied
npx prisma migrate resolve --applied MIGRATION_NAME
```

## Common Mistakes

### ❌ Using `db push` on real databases
```bash
# You have data you care about
npx prisma db push  # ❌ NO! Can lose data
```

### ❌ Deleting old migrations
```bash
rm -rf prisma/migrations/2024*  # ❌ NO! Breaks deployments
```

### ❌ Editing the database manually without tracking
```sql
-- Running SQL directly in psql
ALTER TABLE users ADD COLUMN avatar TEXT;  # ❌ NO! Not tracked
```

### ❌ Mixing approaches
```bash
npx prisma migrate dev --name add_field
# Later...
npx prisma db push  # ❌ NO! Causes drift between schema and history
```

## Useful Commands

```bash
# Check migration status
npx prisma migrate status

# View current schema from database
npx prisma db pull

# Generate diff between schema and database
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Open database GUI
npx prisma studio

# Deploy migrations in production
npx prisma migrate deploy
```

## Deployment

### In Production

```bash
# Run pending migrations (reads all migration files)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

**Never:**
- Use `migrate dev` in production
- Use `db push` in production
- Run SQL manually without creating migrations

## Troubleshooting

### "Migration failed to apply"
1. Check the error message
2. Fix the issue in schema
3. Create a new migration (don't edit the failed one)
4. Or create a manual migration to fix it

### "Migration already applied but file missing"
- Someone deleted migration files
- Restore from git: `git checkout -- prisma/migrations/`

### "Schema and database out of sync"
```bash
# See what's different
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Create migration to fix it
npx prisma migrate dev --name sync_schema
```

## Summary

1. **Always use `migrate dev`** for schema changes
2. **Commit all migration files** to git
3. **Never delete migrations** - keep them forever
4. **Avoid `db push`** except for prototyping
5. **Track all changes** - no manual SQL outside migrations
6. **Migrations = git commits** for your database

---

For more details, see [Prisma Migration Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate).

