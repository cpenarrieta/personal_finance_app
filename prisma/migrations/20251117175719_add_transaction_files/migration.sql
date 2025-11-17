-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "files" TEXT[] DEFAULT ARRAY[]::TEXT[];
