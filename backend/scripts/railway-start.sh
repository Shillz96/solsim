#!/bin/bash
set -e

echo "🚀 Starting Railway deployment..."

# Try to resolve failed migration (ignore errors)
echo "Resolving any failed migrations..."
npx prisma migrate resolve --rolled-back 20251015_rebrand_sim_to_vsol 2>/dev/null || true

# Run the enum migration fix
echo "Applying enum migration fix..."
npm run db:fix-enum

# Start the application
echo "Starting application..."
npm start
