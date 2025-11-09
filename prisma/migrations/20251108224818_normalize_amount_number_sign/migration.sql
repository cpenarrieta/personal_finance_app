-- Migration: Normalize amount_number sign for intuitive display
-- Changes amount_number from Plaid format to display format:
--   OLD: positive = expense, negative = income (Plaid format)
--   NEW: negative = expense, positive = income (intuitive!)
--
-- The original 'amount' column remains unchanged (keeps Plaid format for sync)

-- ============================================================================
-- TRANSACTION TABLE
-- ============================================================================

-- Drop the existing amount_number column
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS amount_number;

-- Recreate with inverted sign (amount * -1)
ALTER TABLE "Transaction"
  ADD COLUMN amount_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(amount * -1 AS double precision)) STORED;

-- Migration complete!
-- amount_number now shows: negative for expenses, positive for income
