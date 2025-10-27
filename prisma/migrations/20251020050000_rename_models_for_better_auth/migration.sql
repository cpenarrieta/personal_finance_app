-- Step 1: Rename existing Account table to PlaidAccount
ALTER TABLE "Account" RENAME TO "PlaidAccount";

-- Step 1a: Rename PlaidAccount constraints and indexes (PostgreSQL auto-renames when table is renamed)
-- Primary keys and indexes are auto-renamed, but we explicitly rename to ensure consistency
ALTER INDEX IF EXISTS "Account_plaidAccountId_key" RENAME TO "PlaidAccount_plaidAccountId_key";

-- Step 2: Rename OAuthAccount table to Account
ALTER TABLE "OAuthAccount" RENAME TO "Account";

-- Step 2a: Rename Account indexes (after table rename)
-- Primary keys are auto-renamed, indexes need explicit rename
ALTER INDEX IF EXISTS "OAuthAccount_userId_idx" RENAME TO "Account_userId_idx";

-- Step 3: Rename columns in Account table to match Better Auth expectations
ALTER TABLE "Account" RENAME COLUMN "providerId" TO "temp_providerId";
ALTER TABLE "Account" RENAME COLUMN "provider" TO "providerId";
ALTER TABLE "Account" RENAME COLUMN "temp_providerId" TO "accountId";

-- Step 4: Drop old unique constraint and create new one
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "OAuthAccount_provider_providerId_key";
ALTER TABLE "Account" ADD CONSTRAINT "Account_providerId_accountId_key" UNIQUE ("providerId", "accountId");

-- Step 5: Update foreign key constraints in related tables
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_accountId_fkey";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PlaidAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Holding" DROP CONSTRAINT IF EXISTS "Holding_accountId_fkey";
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PlaidAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvestmentTransaction" DROP CONSTRAINT IF EXISTS "InvestmentTransaction_accountId_fkey";
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PlaidAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Update Item foreign key reference
ALTER TABLE "PlaidAccount" DROP CONSTRAINT IF EXISTS "Account_itemId_fkey";
ALTER TABLE "PlaidAccount" ADD CONSTRAINT "PlaidAccount_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
