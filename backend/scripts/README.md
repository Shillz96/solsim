# Backend Scripts

This directory contains utility scripts for backend development and maintenance.

## Directory Structure

### 📁 `dangerous/` 
Contains production/destructive scripts that require extra caution. These should only be run by experienced developers who understand the consequences.

⚠️ **WARNING**: Scripts in this folder can delete data or modify production databases. Always backup before running!

### 📁 `dev-tools/`
Contains development utility scripts for testing, data verification, and development environment management.

## Active Scripts

### `verify-env.mjs`
Verifies that all required environment variables are properly configured.

```bash
node scripts/verify-env.mjs
```

### `migrate-to-fifo.ts`
Migrates existing holdings to use FIFO (First In, First Out) accounting for tax lot tracking.

```bash
npm run tsx scripts/migrate-to-fifo.ts
```

## Usage Guidelines

1. **Always backup your data** before running any scripts in the `dangerous/` folder
2. **Test scripts in development** before running in production
3. **Read the script contents** to understand what it does before execution
4. **Use appropriate node environment** when running scripts

## Development Scripts

For development environment management, use scripts in `dev-tools/`:
- `check-all-data.mjs` - Verify database integrity and data consistency
- `reset-dev-user.mjs` - Reset development user data
- `test-prisma.js` - Test Prisma database connection

## Maintenance & Migration Scripts

### Metadata Backfill
Located in `src/scripts/backfillMetadata.ts` - Backfills missing token metadata for historical trades.

```bash
npm run tsx src/scripts/backfillMetadata.ts
```

## Cleanup Notes

- Archive folder removed (historical one-time scripts no longer needed)
- SQLite migration backups removed (project now uses PostgreSQL exclusively)
