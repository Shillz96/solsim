#!/bin/bash

# Script to resolve failed Prisma migration in Railway
# Run this using: railway run bash scripts/resolve-failed-migration.sh

echo "Resolving failed migration: 20251023000000_add_real_trading_support"

# Mark the migration as applied (resolved)
npx prisma migrate resolve --applied 20251023000000_add_real_trading_support

echo "Migration resolved successfully!"
echo "Now you can deploy again and the migration will be skipped."
