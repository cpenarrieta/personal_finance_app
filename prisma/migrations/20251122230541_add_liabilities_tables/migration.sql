-- CreateTable
CREATE TABLE "CreditLiability" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "aprs" JSONB,
    "isOverdue" BOOLEAN,
    "lastPaymentAmount" DECIMAL(14,2),
    "lastPaymentDate" TIMESTAMP(3),
    "lastStatementIssueDate" TIMESTAMP(3),
    "lastStatementBalance" DECIMAL(14,2),
    "minimumPaymentAmount" DECIMAL(14,2),
    "nextPaymentDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "last_payment_amount_number" DOUBLE PRECISION DEFAULT ("lastPaymentAmount")::double precision,
    "last_statement_balance_number" DOUBLE PRECISION DEFAULT ("lastStatementBalance")::double precision,
    "minimum_payment_amount_number" DOUBLE PRECISION DEFAULT ("minimumPaymentAmount")::double precision,
    "last_payment_date_string" TEXT DEFAULT timestamp_to_string("lastPaymentDate"),
    "last_statement_issue_date_string" TEXT DEFAULT timestamp_to_string("lastStatementIssueDate"),
    "next_payment_due_date_string" TEXT DEFAULT timestamp_to_string("nextPaymentDueDate"),
    "created_at_string" TEXT DEFAULT timestamp_to_string("createdAt"),
    "updated_at_string" TEXT DEFAULT timestamp_to_string("updatedAt"),

    CONSTRAINT "CreditLiability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MortgageLiability" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountNumber" TEXT,
    "currentLateFee" DECIMAL(14,2),
    "escrowBalance" DECIMAL(14,2),
    "hasPmi" BOOLEAN,
    "hasPrepaymentPenalty" BOOLEAN,
    "interestRate" JSONB,
    "lastPaymentAmount" DECIMAL(14,2),
    "lastPaymentDate" TIMESTAMP(3),
    "loanTypeDescription" TEXT,
    "loanTerm" TEXT,
    "maturityDate" TIMESTAMP(3),
    "nextMonthlyPayment" DECIMAL(14,2),
    "nextPaymentDueDate" TIMESTAMP(3),
    "originationDate" TIMESTAMP(3),
    "originationPrincipalAmount" DECIMAL(14,2),
    "pastDueAmount" DECIMAL(14,2),
    "propertyAddress" JSONB,
    "ytdInterestPaid" DECIMAL(14,2),
    "ytdPrincipalPaid" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "current_late_fee_number" DOUBLE PRECISION DEFAULT ("currentLateFee")::double precision,
    "escrow_balance_number" DOUBLE PRECISION DEFAULT ("escrowBalance")::double precision,
    "last_payment_amount_number" DOUBLE PRECISION DEFAULT ("lastPaymentAmount")::double precision,
    "next_monthly_payment_number" DOUBLE PRECISION DEFAULT ("nextMonthlyPayment")::double precision,
    "origination_principal_amount_number" DOUBLE PRECISION DEFAULT ("originationPrincipalAmount")::double precision,
    "past_due_amount_number" DOUBLE PRECISION DEFAULT ("pastDueAmount")::double precision,
    "ytd_interest_paid_number" DOUBLE PRECISION DEFAULT ("ytdInterestPaid")::double precision,
    "ytd_principal_paid_number" DOUBLE PRECISION DEFAULT ("ytdPrincipalPaid")::double precision,
    "last_payment_date_string" TEXT DEFAULT timestamp_to_string("lastPaymentDate"),
    "maturity_date_string" TEXT DEFAULT timestamp_to_string("maturityDate"),
    "next_payment_due_date_string" TEXT DEFAULT timestamp_to_string("nextPaymentDueDate"),
    "origination_date_string" TEXT DEFAULT timestamp_to_string("originationDate"),
    "created_at_string" TEXT DEFAULT timestamp_to_string("createdAt"),
    "updated_at_string" TEXT DEFAULT timestamp_to_string("updatedAt"),

    CONSTRAINT "MortgageLiability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLoanLiability" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountNumber" TEXT,
    "disbursementDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expectedPayoffDate" TIMESTAMP(3),
    "guarantor" TEXT,
    "interestRatePercentage" DECIMAL(10,4),
    "isOverdue" BOOLEAN,
    "lastPaymentAmount" DECIMAL(14,2),
    "lastPaymentDate" TIMESTAMP(3),
    "lastStatementBalance" DECIMAL(14,2),
    "lastStatementIssueDate" TIMESTAMP(3),
    "loanName" TEXT,
    "loanStatus" JSONB,
    "minimumPaymentAmount" DECIMAL(14,2),
    "nextPaymentDueDate" TIMESTAMP(3),
    "originationDate" TIMESTAMP(3),
    "originationPrincipalAmount" DECIMAL(14,2),
    "outstandingInterestAmount" DECIMAL(14,2),
    "paymentReferenceNumber" TEXT,
    "repaymentPlan" JSONB,
    "sequenceNumber" TEXT,
    "servicerAddress" JSONB,
    "ytdInterestPaid" DECIMAL(14,2),
    "ytdPrincipalPaid" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "interest_rate_percentage_number" DOUBLE PRECISION DEFAULT ("interestRatePercentage")::double precision,
    "last_payment_amount_number" DOUBLE PRECISION DEFAULT ("lastPaymentAmount")::double precision,
    "last_statement_balance_number" DOUBLE PRECISION DEFAULT ("lastStatementBalance")::double precision,
    "minimum_payment_amount_number" DOUBLE PRECISION DEFAULT ("minimumPaymentAmount")::double precision,
    "origination_principal_amount_number" DOUBLE PRECISION DEFAULT ("originationPrincipalAmount")::double precision,
    "outstanding_interest_amount_number" DOUBLE PRECISION DEFAULT ("outstandingInterestAmount")::double precision,
    "ytd_interest_paid_number" DOUBLE PRECISION DEFAULT ("ytdInterestPaid")::double precision,
    "ytd_principal_paid_number" DOUBLE PRECISION DEFAULT ("ytdPrincipalPaid")::double precision,
    "expected_payoff_date_string" TEXT DEFAULT timestamp_to_string("expectedPayoffDate"),
    "last_payment_date_string" TEXT DEFAULT timestamp_to_string("lastPaymentDate"),
    "last_statement_issue_date_string" TEXT DEFAULT timestamp_to_string("lastStatementIssueDate"),
    "next_payment_due_date_string" TEXT DEFAULT timestamp_to_string("nextPaymentDueDate"),
    "origination_date_string" TEXT DEFAULT timestamp_to_string("originationDate"),
    "created_at_string" TEXT DEFAULT timestamp_to_string("createdAt"),
    "updated_at_string" TEXT DEFAULT timestamp_to_string("updatedAt"),

    CONSTRAINT "StudentLoanLiability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditLiability_accountId_key" ON "CreditLiability"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "MortgageLiability_accountId_key" ON "MortgageLiability"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLoanLiability_accountId_key" ON "StudentLoanLiability"("accountId");

-- AddForeignKey
ALTER TABLE "CreditLiability" ADD CONSTRAINT "CreditLiability_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PlaidAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortgageLiability" ADD CONSTRAINT "MortgageLiability_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PlaidAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLoanLiability" ADD CONSTRAINT "StudentLoanLiability_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PlaidAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
