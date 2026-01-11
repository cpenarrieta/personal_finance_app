-- Fix constraint names to match schema expectations
-- NOTE: Some renames were already done in 20251020050000_rename_models_for_better_auth
-- Using IF EXISTS to handle cases where constraints have already been renamed

-- Step 1: Remove duplicate unique constraint on Account table
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_providerId_accountId_key";

-- Step 2: Rename PlaidAccount table constraints FIRST (to free up "Account_*" names)
-- Only rename if old names still exist (they may have been renamed in earlier migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_pkey' AND conrelid = '"PlaidAccount"'::regclass) THEN
    ALTER TABLE "PlaidAccount" RENAME CONSTRAINT "Account_pkey" TO "PlaidAccount_pkey";
  END IF;
END $$;

-- Step 3: Rename Account (OAuth) table constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OAuthAccount_pkey' AND conrelid = '"Account"'::regclass) THEN
    ALTER TABLE "Account" RENAME CONSTRAINT "OAuthAccount_pkey" TO "Account_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OAuthAccount_userId_fkey' AND conrelid = '"Account"'::regclass) THEN
    ALTER TABLE "Account" RENAME CONSTRAINT "OAuthAccount_userId_fkey" TO "Account_userId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'OAuthAccount_userId_idx') THEN
    ALTER INDEX "OAuthAccount_userId_idx" RENAME TO "Account_userId_idx";
  END IF;
END $$;

-- Step 4: Rename Category table constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomCategory_pkey' AND conrelid = '"Category"'::regclass) THEN
    ALTER TABLE "Category" RENAME CONSTRAINT "CustomCategory_pkey" TO "Category_pkey";
  END IF;
END $$;

-- Step 5: Rename Subcategory table constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomSubcategory_pkey' AND conrelid = '"Subcategory"'::regclass) THEN
    ALTER TABLE "Subcategory" RENAME CONSTRAINT "CustomSubcategory_pkey" TO "Subcategory_pkey";
  END IF;
END $$;

