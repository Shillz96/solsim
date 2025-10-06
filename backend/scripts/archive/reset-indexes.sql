-- Script to safely reset database indexes
-- Run this before applying migrations if you get "relation already exists" errors

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS "Trade_userId_timestamp_idx";
DROP INDEX IF EXISTS "Trade_tokenAddress_timestamp_idx";
DROP INDEX IF EXISTS "Holding_userId_idx";
DROP INDEX IF EXISTS "Holding_tokenAddress_idx";
DROP INDEX IF EXISTS "Token_lastTs_idx";
DROP INDEX IF EXISTS "Token_isTrending_momentumScore_idx";
DROP INDEX IF EXISTS "Token_symbol_idx";
DROP INDEX IF EXISTS "Token_isNew_idx";

-- Now you can run: npx prisma migrate deploy
-- Or manually create the indexes with the migration file
