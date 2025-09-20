#!/bin/bash

# Fix failed Prisma migration on Railway
echo "🔧 Fixing failed Prisma migration..."

# Mark the failed migration as resolved
echo "📝 Marking migration as resolved..."
npx prisma migrate resolve --applied 20250115000000_add_isSuspended_field

# Deploy remaining migrations
echo "🚀 Deploying remaining migrations..."
npx prisma migrate deploy

echo "✅ Migration fix complete!"
