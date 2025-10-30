# 🗄️ Database Setup Guide - Local Development

## Overview

You have **3 options** for running the database locally. Choose based on your needs:

1. **Cloud Database (Easiest)** - Use a free cloud PostgreSQL instance
2. **Local PostgreSQL (Most Control)** - Install and run PostgreSQL on your machine
3. **Production Database Clone (Testing)** - Use production database in read-only mode

---

## ✅ Option 1: Cloud Database (RECOMMENDED)

This is the **easiest and fastest** way to get started. No local installation needed!

### A. Neon (Recommended - Free Tier)

1. **Sign up**: Go to https://neon.tech
2. **Create project**: Click "Create Project"
3. **Copy connection string**: 
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
   ```
4. **Update backend/.env.local**:
   ```bash
   DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
   DATABASE_URL_DIRECT=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
   ```
5. **Run migrations**:
   ```bash
   cd backend
   npm run db:migrate
   ```
6. **Done!** Start your backend: `npm run dev`

### B. Supabase (Alternative - Free Tier)

1. **Sign up**: Go to https://supabase.com
2. **Create project**: New Project → Choose name and password
3. **Get connection string**: Settings → Database → Connection string → Direct connection
4. **Update backend/.env.local** (same as Neon above)
5. **Run migrations**: `cd backend && npm run db:migrate`

### C. Railway (If you already use Railway)

1. **Create database**: Railway dashboard → New → PostgreSQL
2. **Copy connection string**: Click database → Connect → Copy URL
3. **Update backend/.env.local** (same as above)
4. **Run migrations**: `cd backend && npm run db:migrate`

**✅ Pros**:
- ✅ No local installation
- ✅ Free tier available
- ✅ Always accessible (no need to start/stop)
- ✅ Automatic backups
- ✅ Easy to share with team

**❌ Cons**:
- ❌ Requires internet connection
- ❌ Free tier has limits (usually sufficient for development)

---

## Option 2: Local PostgreSQL

Install PostgreSQL on your Windows machine for full control.

### Installation

#### Using Official Installer (Recommended)

1. **Download**: https://www.postgresql.org/download/windows/
   - Choose PostgreSQL 14 or newer
   - Run the installer (postgresql-16.x-windows-x64.exe)

2. **Installation Options**:
   - Set password for `postgres` user (remember this!)
   - Port: `5432` (default)
   - Install pgAdmin (GUI tool)

3. **Create Database**:
   ```bash
   # Open PowerShell
   # Login to PostgreSQL
   psql -U postgres
   
   # Enter password you set during installation
   
   # Create database
   CREATE DATABASE solsim_dev;
   
   # Verify
   \l
   
   # Exit
   \q
   ```

4. **Update backend/.env.local**:
   ```bash
   # Replace 'password' with your PostgreSQL password
   DATABASE_URL=postgresql://postgres:password@localhost:5432/solsim_dev
   DATABASE_URL_DIRECT=postgresql://postgres:password@localhost:5432/solsim_dev
   ```

5. **Run migrations**:
   ```bash
   cd backend
   npm run db:migrate
   ```

#### Using Docker (Alternative)

If you have Docker Desktop installed:

```bash
# Start PostgreSQL container
docker run --name solsim-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=solsim_dev -p 5432:5432 -d postgres:16

# Check if running
docker ps

# Update backend/.env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/solsim_dev
DATABASE_URL_DIRECT=postgresql://postgres:password@localhost:5432/solsim_dev

# Run migrations
cd backend
npm run db:migrate
```

**✅ Pros**:
- ✅ Full control
- ✅ Works offline
- ✅ No external dependencies
- ✅ Fastest performance

**❌ Cons**:
- ❌ Requires installation
- ❌ Must start/stop manually (if not using Docker)
- ❌ More complex setup

---

## Option 3: Production Database (Testing Only)

Use your production Railway database for local testing.

### Setup

1. **Get production connection string**:
   - Go to Railway dashboard
   - Click your PostgreSQL database
   - Copy "DATABASE_URL" from Variables tab

2. **Update backend/.env.local**:
   ```bash
   DATABASE_URL=postgresql://postgres:password@your-railway-db.railway.app:5432/railway
   DATABASE_URL_DIRECT=postgresql://postgres:password@your-railway-db.railway.app:5432/railway
   ```

3. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

**⚠️ IMPORTANT WARNINGS**:
- ⚠️ **READ-ONLY recommended**: Don't modify production data
- ⚠️ **Shared data**: Other users will see your test data
- ⚠️ **No migrations**: Don't run `db:migrate` on production!
- ⚠️ **Connection limits**: Production database has connection limits

**✅ Use this for**:
- ✅ Quick testing with real data
- ✅ Debugging production issues
- ✅ Temporary development when local DB is down

**❌ Don't use this for**:
- ❌ Running database migrations
- ❌ Long-term development
- ❌ Testing destructive operations

---

## 🔧 After Database Setup

Once your database is configured:

### 1. Run Migrations

```bash
cd backend
npm run db:migrate
```

This creates all the tables, indexes, and constraints.

### 2. (Optional) Seed Test Data

```bash
cd backend
npm run db:seed
```

This adds sample users, tokens, and trades for testing.

### 3. Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected
✅ Redis connected
🚀 Server listening on http://localhost:8000
```

### 4. Verify Database

Open Prisma Studio to view your database:
```bash
npm run db:studio
```

This opens a GUI at http://localhost:5555 where you can:
- View all tables
- Add/edit/delete records
- Run queries

---

## 🐛 Troubleshooting

### "Invalid value undefined for datasource 'db'"

**Problem**: Backend can't find `DATABASE_URL`

**Solution**:
1. Verify `backend/.env.local` exists
2. Check it contains `DATABASE_URL=postgresql://...`
3. Restart your terminal/IDE to reload environment variables

### "Can't reach database server"

**Problem**: Database is not running or connection string is wrong

**Solutions**:
- **Local PostgreSQL**: 
  ```bash
  # Check if PostgreSQL is running (Windows)
  Get-Service -Name postgresql*
  
  # Start if not running
  Start-Service -Name postgresql-x64-16
  ```

- **Docker**:
  ```bash
  docker ps  # Check container is running
  docker start solsim-postgres  # Start if stopped
  ```

- **Cloud DB**: Check your internet connection and connection string

### "SSL connection required"

**Problem**: Cloud database requires SSL

**Solution**: Add `?sslmode=require` to connection string:
```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### "Password authentication failed"

**Problem**: Wrong username or password

**Solution**:
- **Local**: Check password set during PostgreSQL installation
- **Cloud**: Regenerate password in cloud dashboard
- **Docker**: Check password in docker run command

### "Database does not exist"

**Problem**: Database not created yet

**Solution**:
```bash
# Local PostgreSQL
psql -U postgres
CREATE DATABASE solsim_dev;
\q

# Then run migrations
cd backend
npm run db:migrate
```

### "Too many connections"

**Problem**: Hit connection limit (common with free tiers)

**Solution**:
- Close unused connections (restart backend)
- Use connection pooling (already configured in Prisma)
- Upgrade to paid plan if needed

---

## 📊 Database Management

### View Database

```bash
# Open Prisma Studio GUI
npm run db:studio
```

### Run Migrations

```bash
# Apply pending migrations
npm run db:migrate

# Create new migration after schema changes
cd backend
npm run db:migrate:dev -- --name migration_name
```

### Reset Database (⚠️ Deletes ALL Data)

```bash
cd backend
npm run db:reset
```

### Backup Database

**Local PostgreSQL**:
```bash
pg_dump -U postgres solsim_dev > backup.sql
```

**Restore**:
```bash
psql -U postgres solsim_dev < backup.sql
```

---

## 🎯 Recommended Setup for Different Scenarios

### Scenario 1: Just Starting Development
→ **Use Neon** (cloud database)
- Easiest setup
- No installation
- Free tier sufficient

### Scenario 2: Serious Development
→ **Use Local PostgreSQL**
- Full control
- Best performance
- Works offline

### Scenario 3: Testing with Real Data
→ **Use Production Clone** (temporary)
- Real data for testing
- Don't run migrations!
- Switch back to local DB after

### Scenario 4: Team Development
→ **Use Cloud Database** (Neon/Supabase)
- Shared database for team
- Easy collaboration
- No setup for new team members

---

## ✅ Quick Start (Choose One)

### Cloud Database (Easiest)
```bash
# 1. Create Neon account and database
# 2. Copy connection string
# 3. Update backend/.env.local:
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb
DATABASE_URL_DIRECT=postgresql://user:pass@ep-xxx.neon.tech/neondb

# 4. Run migrations
cd backend
npm run db:migrate

# 5. Start backend
npm run dev
```

### Local PostgreSQL
```bash
# 1. Install PostgreSQL from postgresql.org
# 2. Create database
psql -U postgres
CREATE DATABASE solsim_dev;
\q

# 3. Update backend/.env.local:
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/solsim_dev
DATABASE_URL_DIRECT=postgresql://postgres:yourpassword@localhost:5432/solsim_dev

# 4. Run migrations
cd backend
npm run db:migrate

# 5. Start backend
npm run dev
```

---

## 🆘 Still Having Issues?

1. Check `backend/.env.local` has valid `DATABASE_URL`
2. Test database connection:
   ```bash
   cd backend
   npx prisma db pull
   ```
3. Check PostgreSQL is running (local setup)
4. Verify internet connection (cloud database)
5. Review error messages carefully

---

**Next Steps**: Once database is working, see [LOCAL_DEV_SETUP.md](../LOCAL_DEV_SETUP.md) for complete development workflow.
