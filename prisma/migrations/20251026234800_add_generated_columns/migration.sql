-- Migration: Add generated columns for serialization-free client components
-- Generated columns are automatically computed and always stay in sync with source columns

-- ============================================================================
-- CREATE IMMUTABLE HELPER FUNCTION
-- ============================================================================
-- PostgreSQL requires immutable functions for generated columns
-- to_char() is not marked as immutable, so we create a wrapper
CREATE OR REPLACE FUNCTION timestamp_to_string(ts timestamp)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN ts IS NULL THEN NULL
    ELSE to_char(ts, 'YYYY-MM-DD HH24:MI:SS.MS')
  END
$$;

-- ============================================================================
-- TRANSACTION TABLE
-- ============================================================================
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS amount_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(amount AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS date_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string(date)) STORED,
  ADD COLUMN IF NOT EXISTS authorized_date_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("authorizedDate")) STORED,
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- PLAID ACCOUNT TABLE
-- ============================================================================
ALTER TABLE "PlaidAccount"
  ADD COLUMN IF NOT EXISTS current_balance_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST("currentBalance" AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS available_balance_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST("availableBalance" AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS credit_limit_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST("creditLimit" AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS balance_updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("balanceUpdatedAt")) STORED,
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- HOLDING TABLE
-- ============================================================================
ALTER TABLE "Holding"
  ADD COLUMN IF NOT EXISTS quantity_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(quantity AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS cost_basis_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST("costBasis" AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS institution_price_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST("institutionPrice" AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS institution_price_as_of_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("institutionPriceAsOf")) STORED,
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- INVESTMENT TRANSACTION TABLE
-- ============================================================================
ALTER TABLE "InvestmentTransaction"
  ADD COLUMN IF NOT EXISTS amount_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(amount AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS price_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(price AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS quantity_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(quantity AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS fees_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(fees AS double precision)) STORED,
  ADD COLUMN IF NOT EXISTS date_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string(date)) STORED,
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- SECURITY TABLE
-- ============================================================================
ALTER TABLE "Security"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- CUSTOM CATEGORY TABLE
-- ============================================================================
ALTER TABLE "CustomCategory"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- CUSTOM SUBCATEGORY TABLE
-- ============================================================================
ALTER TABLE "CustomSubcategory"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- TAG TABLE
-- ============================================================================
ALTER TABLE "Tag"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- CATEGORY GROUP TABLE
-- ============================================================================
ALTER TABLE "CategoryGroup"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- ============================================================================
-- TRANSACTION TAG TABLE
-- ============================================================================
ALTER TABLE "TransactionTag"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED;

-- ============================================================================
-- CATEGORY GROUP ITEM TABLE
-- ============================================================================
ALTER TABLE "CategoryGroupItem"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED;

-- ============================================================================
-- INSTITUTION TABLE
-- ============================================================================
ALTER TABLE "Institution"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED;

-- ============================================================================
-- ITEM TABLE
-- ============================================================================
ALTER TABLE "Item"
  ADD COLUMN IF NOT EXISTS created_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("createdAt")) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_string TEXT
    GENERATED ALWAYS AS (timestamp_to_string("updatedAt")) STORED;

-- Migration complete!
-- Generated columns will now automatically sync whenever source columns are updated.
