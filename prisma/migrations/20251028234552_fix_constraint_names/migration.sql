-- Fix constraint names to match schema expectations

-- Step 1: Remove duplicate unique constraint on Account table
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_providerId_accountId_key";

-- Step 2: Rename PlaidAccount table constraints FIRST (to free up "Account_*" names)
ALTER TABLE "PlaidAccount" RENAME CONSTRAINT "Account_pkey" TO "PlaidAccount_pkey";
ALTER INDEX "Account_plaidAccountId_key" RENAME TO "PlaidAccount_plaidAccountId_key";

-- Step 3: Rename Account (OAuth) table constraints
ALTER TABLE "Account" RENAME CONSTRAINT "OAuthAccount_pkey" TO "Account_pkey";
ALTER TABLE "Account" RENAME CONSTRAINT "OAuthAccount_userId_fkey" TO "Account_userId_fkey";
ALTER INDEX "OAuthAccount_userId_idx" RENAME TO "Account_userId_idx";

-- Step 4: Rename Category table constraints
ALTER TABLE "Category" RENAME CONSTRAINT "CustomCategory_pkey" TO "Category_pkey";

-- Step 5: Rename Subcategory table constraints
ALTER TABLE "Subcategory" RENAME CONSTRAINT "CustomSubcategory_pkey" TO "Subcategory_pkey";

