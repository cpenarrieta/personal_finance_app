-- Add new transactionDatetime string column (nullable)
ALTER TABLE "InvestmentTransaction" ADD COLUMN "transactionDatetime" TEXT;

-- Backfill transactionDatetime from existing date field (convert to ISO 8601 string)
UPDATE "InvestmentTransaction"
SET "transactionDatetime" = to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

-- Drop old generated date_string column (replaced by transactionDatetime)
ALTER TABLE "InvestmentTransaction" DROP COLUMN "date_string";
