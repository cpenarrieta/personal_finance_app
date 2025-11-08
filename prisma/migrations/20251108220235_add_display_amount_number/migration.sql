-- Migration: Add display_amount_number generated column
-- This column normalizes transaction signs for frontend display:
--   Expenses (Plaid: positive) -> Negative for display
--   Income (Plaid: negative) -> Positive for display

-- ============================================================================
-- TRANSACTION TABLE
-- ============================================================================
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS display_amount_number DOUBLE PRECISION
    GENERATED ALWAYS AS (CAST(amount * -1 AS double precision)) STORED;

-- Migration complete!
-- display_amount_number will automatically sync whenever amount is updated.
