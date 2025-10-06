# Railway Database Migration Guide

## Important: Run Migrations Separately

Due to Railway's container permissions, database migrations should be run separately from the application startup.

## Method 1: Using Railway CLI (Recommended)

After your backend is deployed and running:

```bash
cd backend
railway run npx prisma migrate deploy
```

This runs the migration in Railway's environment with proper database connection.

## Method 2: Using Railway Dashboard

1. Go to your Railway project dashboard
2. Click on the backend service
3. Go to the "Settings" tab
4. Find "Deploy" section
5. Click "Run a command"
6. Enter: `npx prisma migrate deploy`
7. Click "Run"

## Method 3: One-time Migration Container

Create a temporary migration job:

```bash
railway run --service backend -- npx prisma migrate deploy
```

## Initial Database Seed (Optional)

If you want to seed the database with initial data:

```bash
railway run npx prisma db seed
```

## Troubleshooting

### "Can't write to /app/node_modules/@prisma/engines" Error

This error occurs when trying to run migrations in the Docker container at startup. The solution is to run migrations separately as shown above.

### Database Connection Issues

Ensure your DATABASE_URL is properly set in Railway environment variables. Railway automatically sets this when you add a PostgreSQL service.

### OpenSSL Warning

The warning about libssl/openssl can be safely ignored. Railway's nixpacks builder includes the necessary libraries.

## Best Practices

1. **Always run migrations before deploying new code** that includes schema changes
2. **Test migrations locally first** with a similar PostgreSQL version
3. **Keep migration files in version control** (already done in prisma/migrations)
4. **Use Railway's database backups** before running migrations in production

## Verifying Migrations

After running migrations, verify they were applied:

```bash
railway run npx prisma migrate status
```

This will show you which migrations have been applied to your database.
