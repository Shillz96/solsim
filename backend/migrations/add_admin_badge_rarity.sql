-- Add ADMIN and DEVELOPER rarities to BadgeRarity enum
-- This fixes the admin badge appearing white by giving it a dedicated rarity

-- First, add the new enum values
ALTER TYPE "BadgeRarity" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "BadgeRarity" ADD VALUE IF NOT EXISTS 'DEVELOPER';

-- Update the admin badge to use ADMIN rarity instead of LEGENDARY
UPDATE "Badge" 
SET rarity = 'ADMIN' 
WHERE id = 'badge_admin';

-- Optional: Update any developer badges to use DEVELOPER rarity
-- UPDATE "Badge" 
-- SET rarity = 'DEVELOPER' 
-- WHERE id LIKE 'badge_developer%';
