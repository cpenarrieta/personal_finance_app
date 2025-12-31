-- CreateTable
CREATE TABLE "SpendingSummary" (
    "id" TEXT NOT NULL,
    "monthsBack" INTEGER NOT NULL,
    "facts" JSONB NOT NULL,
    "savingOpportunities" JSONB NOT NULL,
    "dateRangeStart" TEXT NOT NULL,
    "dateRangeEnd" TEXT NOT NULL,
    "totalSpending" DOUBLE PRECISION NOT NULL,
    "totalIncome" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "created_at_string" TEXT DEFAULT timestamp_to_string("createdAt"),
    "updated_at_string" TEXT DEFAULT timestamp_to_string("updatedAt"),

    CONSTRAINT "SpendingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpendingSummary_monthsBack_key" ON "SpendingSummary"("monthsBack");
