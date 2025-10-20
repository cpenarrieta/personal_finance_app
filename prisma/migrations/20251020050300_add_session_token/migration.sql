-- AlterTable
ALTER TABLE "Session" ADD COLUMN "token" TEXT NOT NULL DEFAULT '';

-- Update to remove default after adding column
ALTER TABLE "Session" ALTER COLUMN "token" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
