-- Check current admin user status
SELECT id, email, "userTier", "emailVerified" 
FROM "User" 
WHERE email = 'admin@admin.com';

-- Update admin user to have ADMINISTRATOR tier
UPDATE "User" 
SET "userTier" = 'ADMINISTRATOR', "emailVerified" = true
WHERE email = 'admin@admin.com';

-- Verify the update
SELECT id, email, "userTier", "emailVerified" 
FROM "User" 
WHERE email = 'admin@admin.com';
