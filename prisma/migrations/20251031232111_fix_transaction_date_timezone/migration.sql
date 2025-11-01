-- Fix transaction date timezone issue
-- Transaction dates from Plaid are date-only (no time component)
-- Store them as date-only strings to avoid timezone confusion

-- Update the timestamp_to_string function to return date-only format for date fields
CREATE OR REPLACE FUNCTION timestamp_to_date_string(ts timestamp)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN ts IS NULL THEN NULL
    ELSE to_char(ts, 'YYYY-MM-DD')
  END
$$;

-- Update Transaction date_string to use date-only format
ALTER TABLE "Transaction"
  DROP COLUMN IF EXISTS date_string,
  ADD COLUMN date_string text
    GENERATED ALWAYS AS (timestamp_to_date_string(date)) STORED;

-- Update InvestmentTransaction date_string to use date-only format
ALTER TABLE "InvestmentTransaction"
  DROP COLUMN IF EXISTS date_string,
  ADD COLUMN date_string text
    GENERATED ALWAYS AS (timestamp_to_date_string(date)) STORED;
