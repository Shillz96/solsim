-- Fix UUID defaults for User table
-- This migration adds UUID defaults to fix the null constraint violation

-- Add UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update User table to have UUID default
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Update Trade table to have UUID default  
ALTER TABLE "Trade" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Update Position table to have UUID default
ALTER TABLE "Position" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Update PositionLot table to have UUID default
ALTER TABLE "PositionLot" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Update RealizedPnL table to have UUID default
ALTER TABLE "RealizedPnL" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Update other tables that need UUID defaults
-- Add more tables as needed based on your schema
