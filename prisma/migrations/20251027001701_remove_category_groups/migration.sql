-- DropForeignKey
ALTER TABLE "CategoryGroupItem" DROP CONSTRAINT IF EXISTS "CategoryGroupItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryGroupItem" DROP CONSTRAINT IF EXISTS "CategoryGroupItem_groupId_fkey";

-- DropTable
DROP TABLE IF EXISTS "CategoryGroupItem";

-- DropTable
DROP TABLE IF EXISTS "CategoryGroup";

