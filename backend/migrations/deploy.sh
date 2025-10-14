#!/bin/bash
# Deploy migration script to Railway database
# Run this with: railway run bash migrations/deploy.sh

echo "Deploying enhanced PnL tracking migration..."

# Get database URL from Railway environment
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

# Run the migration SQL file
psql "$DATABASE_URL" -f prisma/migrations/20251013_add_enhanced_pnl_tracking.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration deployed successfully!"
else
  echo "❌ Migration failed!"
  exit 1
fi
