# Backend Scripts

This directory contains utility scripts for backend development and maintenance.

## Directory Structure

### 📁 `archive/`
Contains historical scripts and one-time fixes that were used during development. These are kept for reference but should not be used in current development.

### 📁 `dangerous/` 
Contains production/destructive scripts that require extra caution. These should only be run by experienced developers who understand the consequences.

### 📁 `dev-tools/`
Contains development utility scripts for testing, data verification, and development environment management.

## Active Scripts

### `verify-env.mjs`
Verifies that all required environment variables are properly configured.

```bash
node scripts/verify-env.mjs
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

## Archive

The `archive/` folder contains historical scripts that were used for one-time fixes and migrations. These are preserved for reference but are not intended for current use.
