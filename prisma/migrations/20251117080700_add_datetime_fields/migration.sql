-- Add new datetime string columns (nullable initially for backfill)
ALTER TABLE "Transaction" ADD COLUMN "datetime" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "authorizedDatetime" TEXT;

-- Backfill datetime from existing date field (convert to ISO 8601 string)
UPDATE "Transaction"
SET "datetime" = to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

-- Backfill authorizedDatetime from existing authorizedDate field
UPDATE "Transaction"
SET "authorizedDatetime" = to_char("authorizedDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE "authorizedDate" IS NOT NULL;

-- Make datetime NOT NULL (required field)
ALTER TABLE "Transaction" ALTER COLUMN "datetime" SET NOT NULL;

-- Drop old generated string columns (replaced by datetime/authorizedDatetime)
ALTER TABLE "Transaction" DROP COLUMN "date_string";
ALTER TABLE "Transaction" DROP COLUMN "authorized_date_string";
