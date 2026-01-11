-- Update categories with isTransferCategory=true to have groupType='TRANSFER'
UPDATE "Category"
SET "groupType" = 'TRANSFER'::"CategoryGroupType"
WHERE "isTransferCategory" = true;

-- Drop the isTransferCategory column (deprecated)
ALTER TABLE "Category" DROP COLUMN "isTransferCategory";
