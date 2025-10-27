-- Fix Account and PlaidAccount constraint/index names after Better Auth migration
-- This migration was applied manually to the database before being tracked
-- The changes documented here already exist in the production database
-- This file exists for migration history completeness

-- These renames were done manually:
-- 1. Account table: OAuthAccount_* → Account_*
-- 2. PlaidAccount table: Account_* → PlaidAccount_*

-- No SQL changes needed - constraints already have correct names in database

