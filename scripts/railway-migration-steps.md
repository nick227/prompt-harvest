# Railway Migration Deployment Steps

## Overview
This guide will help you safely deploy the `blog_posts` and `api_requests` tables to your Railway production database without data loss.

## Prerequisites
1. Railway CLI installed: `npm install -g @railway/cli`
2. Logged into Railway: `railway login`
3. Connected to your project: `railway link`

## Migration Files
- **Migration**: `prisma/migrations/20250117000000_add_blog_posts_and_api_requests/migration.sql`
- **Tables**: `blog_posts`, `api_requests`

## Deployment Steps

### Step 1: Verify Railway Connection
```bash
railway status
```

### Step 2: Check Existing Tables
```bash
railway connect mysql
```
Then run this SQL:
```sql
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('blog_posts', 'api_requests');
```

### Step 3: Execute Migration
```bash
railway connect mysql < prisma/migrations/20250117000000_add_blog_posts_and_api_requests/migration.sql
```

### Step 4: Verify Migration
```bash
railway connect mysql
```
Then run this SQL:
```sql
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('blog_posts', 'api_requests')
ORDER BY TABLE_NAME;
```

## Alternative: Using Railway Dashboard

1. Go to your Railway project dashboard
2. Navigate to your MySQL database service
3. Click on "Connect" or "Query"
4. Copy and paste the migration SQL from the migration file
5. Execute the SQL

## Safety Features

The migration includes:
- ✅ **Safe table creation** - Only creates tables if they don't exist
- ✅ **Foreign key constraints** - Proper relationships to users table
- ✅ **Indexes** - Optimized for performance
- ✅ **No data loss** - Only adds new tables, doesn't modify existing ones

## Post-Deployment

After successful migration:
1. Test your application locally with the new tables
2. Commit and push your changes to trigger Railway deployment
3. Monitor your application for any issues
4. The new tables will be available in production

## Rollback (if needed)

If you need to rollback:
```sql
DROP TABLE IF EXISTS api_requests;
DROP TABLE IF EXISTS blog_posts;
```

## Verification Commands

Check table structure:
```sql
DESCRIBE blog_posts;
DESCRIBE api_requests;
```

Check foreign keys:
```sql
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('blog_posts', 'api_requests');
```
