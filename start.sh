#!/bin/sh
set -e

echo "🔍 Checking migration status..."

# Check for pending migrations (non-blocking)
if npx prisma migrate status 2>&1 | grep -q "following migration.*not yet been applied"; then
    echo "⚠️  WARNING: Pending migrations detected!"
    echo "📝 To apply migrations, run: npm run db:deploy"
    echo "🔍 To review migrations first: npx prisma migrate status"
    echo ""
fi

echo "✅ Generating Prisma Client (safe - no schema changes)..."
npx prisma generate

echo "🚀 Starting server..."
exec node server.js

