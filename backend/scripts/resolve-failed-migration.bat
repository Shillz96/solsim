@echo off
REM Script to resolve failed Prisma migration in Railway
REM Run this using: railway run cmd /c scripts\resolve-failed-migration.bat

echo Resolving failed migration: 20251023000000_add_real_trading_support

npx prisma migrate resolve --applied 20251023000000_add_real_trading_support

echo Migration resolved successfully!
echo Now you can deploy again and the migration will be skipped.
