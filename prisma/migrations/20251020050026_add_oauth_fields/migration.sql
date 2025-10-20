-- Add new columns to Account table (skip constraint renames - already done in previous migration)
ALTER TABLE "Account"
ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "idToken" TEXT,
ADD COLUMN IF NOT EXISTS "password" TEXT,
ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "scope" TEXT;
