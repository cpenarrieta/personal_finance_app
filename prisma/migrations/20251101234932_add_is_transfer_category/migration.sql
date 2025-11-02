-- AlterTable
ALTER TABLE "Category" ADD COLUMN "isTransferCategory" BOOLEAN NOT NULL DEFAULT false;

-- Update existing Transfers category
UPDATE "Category"
SET "isTransferCategory" = true
WHERE name LIKE '%Transfer%' OR name LIKE '%transfer%';
