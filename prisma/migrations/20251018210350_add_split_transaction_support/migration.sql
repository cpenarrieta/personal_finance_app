-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isSplit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalTransactionId" TEXT,
ADD COLUMN     "parentTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_parentTransactionId_idx" ON "Transaction"("parentTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_originalTransactionId_idx" ON "Transaction"("originalTransactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
