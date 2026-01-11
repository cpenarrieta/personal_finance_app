-- Simplify WeeklySummary table to just store 5 bullet points

-- Drop the old columns
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "weekStartDate";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "weekEndDate";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "totalSpending";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "totalIncome";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "netSavings";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "topCategories";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "trends";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "savingOpportunities";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "insights";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "week_start_date_string";
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "week_end_date_string";

-- Add the new simplified summary column (5 bullet points)
ALTER TABLE "WeeklySummary" ADD COLUMN IF NOT EXISTS "summary" TEXT;

-- Add generated_at_string if not exists
ALTER TABLE "WeeklySummary" DROP COLUMN IF EXISTS "generated_at_string";
ALTER TABLE "WeeklySummary" ADD COLUMN "generated_at_string" TEXT GENERATED ALWAYS AS (timestamp_to_string("generatedAt")) STORED;

-- Make summary NOT NULL (will fail if existing rows - drop them first)
DELETE FROM "WeeklySummary";
ALTER TABLE "WeeklySummary" ALTER COLUMN "summary" SET NOT NULL;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS "WeeklySummary_generatedAt_idx" ON "WeeklySummary"("generatedAt");
