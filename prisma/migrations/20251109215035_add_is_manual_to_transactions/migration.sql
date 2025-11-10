-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing data: mark transactions with 'manual_' prefix as manual
UPDATE "Transaction"
SET "isManual" = true
WHERE "plaidTransactionId" LIKE 'manual_%';
