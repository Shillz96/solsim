-- PRODUCTION DATABASE SCHEMA FIX
-- Add missing columns that are causing 500 errors

-- Check if avgBuyMarketCap column exists in Holding table
-- If not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Holding' 
        AND column_name = 'avgBuyMarketCap'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Holding" ADD COLUMN "avgBuyMarketCap" DECIMAL;
        RAISE NOTICE 'Added avgBuyMarketCap column to Holding table';
    ELSE
        RAISE NOTICE 'avgBuyMarketCap column already exists in Holding table';
    END IF;
END $$;

-- Check if marketCapUsd column exists in Trade table
-- If not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Trade' 
        AND column_name = 'marketCapUsd'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Trade" ADD COLUMN "marketCapUsd" DECIMAL;
        RAISE NOTICE 'Added marketCapUsd column to Trade table';
    ELSE
        RAISE NOTICE 'marketCapUsd column already exists in Trade table';
    END IF;
END $$;

-- Verify the fix
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('Holding', 'Trade')
    AND column_name IN ('avgBuyMarketCap', 'marketCapUsd')
    AND table_schema = 'public'
ORDER BY table_name, column_name;