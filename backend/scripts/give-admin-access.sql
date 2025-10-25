-- Give Admin Access SQL Script
-- 
-- This script grants administrator privileges to a user
-- Replace 'your-email@example.com' with your actual email address

-- Option 1: Update by email (recommended)
UPDATE "User" 
SET "userTier" = 'ADMINISTRATOR' 
WHERE "email" = 'admin@admin.com';

-- Option 2: Update by username (alternative)
-- UPDATE "User" 
-- SET "userTier" = 'ADMINISTRATOR' 
-- WHERE "username" = 'your-username';

-- Option 3: Update by user ID (if you know the UUID)
-- UPDATE "User" 
-- SET "userTier" = 'ADMINISTRATOR' 
-- WHERE "id" = 'your-user-id-here';

-- Verify the change
SELECT "id", "email", "username", "userTier" 
FROM "User" 
WHERE "userTier" = 'ADMINISTRATOR';
