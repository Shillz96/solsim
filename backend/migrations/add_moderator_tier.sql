-- Add MODERATOR to UserTier enum if it doesn't exist
-- This migration adds the MODERATOR tier between VSOL_HOLDER and ADMINISTRATOR

DO $$
BEGIN
  -- Check if MODERATOR already exists in the enum
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserTier' 
    AND e.enumlabel = 'MODERATOR'
  ) THEN
    -- Add MODERATOR to the enum
    -- Note: Adding to the end is safest for existing data
    ALTER TYPE "UserTier" ADD VALUE 'MODERATOR';
    
    RAISE NOTICE 'Added MODERATOR to UserTier enum';
  ELSE
    RAISE NOTICE 'MODERATOR already exists in UserTier enum';
  END IF;
END $$;

-- Verify the enum values
SELECT enumlabel as tier_value, enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'UserTier'
ORDER BY enumsortorder;
