-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "availableBalance" DECIMAL(14,2),
ADD COLUMN     "balanceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "creditLimit" DECIMAL(14,2),
ADD COLUMN     "currentBalance" DECIMAL(14,2);
