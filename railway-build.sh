#!/bin/bash

# Railway build script with migration fix and data sync
echo "🚀 Starting Railway build process..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Step 3: Check if migration needs fixing
echo "🔍 Checking migration status..."
if npx prisma migrate status | grep -q "20250115000000_add_isSuspended_field.*failed"; then
    echo "🔧 Fixing failed migration..."
    npx prisma migrate resolve --applied 20250115000000_add_isSuspended_field
else
    echo "✅ No failed migrations found"
fi

# Step 4: Deploy migrations
echo "📦 Deploying migrations..."
npx prisma migrate deploy

# Step 5: Import critical data (if data-export.json exists)
if [ -f "data-export.json" ]; then
    echo "📥 Importing critical data..."
    node scripts/railway-deploy-with-data.js
else
    echo "⚠️ No data export file found, skipping data import"
fi

echo "✅ Railway build completed successfully!"
