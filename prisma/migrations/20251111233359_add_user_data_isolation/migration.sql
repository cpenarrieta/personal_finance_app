-- Add userId columns to Item, Tag, and Category tables (nullable first for backfill)
ALTER TABLE "Item" ADD COLUMN "userId" TEXT;
ALTER TABLE "Tag" ADD COLUMN "userId" TEXT;
ALTER TABLE "Category" ADD COLUMN "userId" TEXT;

-- Backfill userId with the first user in the database
-- This assumes the app was previously single-user
DO $$
DECLARE
    first_user_id TEXT;
BEGIN
    -- Get the first user ID
    SELECT id INTO first_user_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;

    -- If a user exists, backfill all data with that user's ID
    IF first_user_id IS NOT NULL THEN
        UPDATE "Item" SET "userId" = first_user_id WHERE "userId" IS NULL;
        UPDATE "Tag" SET "userId" = first_user_id WHERE "userId" IS NULL;
        UPDATE "Category" SET "userId" = first_user_id WHERE "userId" IS NULL;
    END IF;
END $$;

-- Make userId columns NOT NULL
ALTER TABLE "Item" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;

-- Drop old unique constraints that didn't include userId
ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_name_key";

-- Add foreign key constraints with cascade delete
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for userId columns for query performance
CREATE INDEX "Item_userId_idx" ON "Item"("userId");
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- Add composite unique constraints (userId + name)
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
