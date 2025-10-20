#!/bin/sh
set -e

echo "🔍 Checking migration status..."

# In production, automatically apply migrations
if [ "$NODE_ENV" = "production" ]; then
    echo "🔄 Production mode: Applying migrations automatically..."

    # Check if there are pending migrations
    if npx prisma migrate status 2>&1 | grep -q "following migration.*not yet been applied"; then
        echo "📦 Applying pending migrations..."
        npx prisma migrate deploy
        echo "✅ Migrations applied successfully!"
    else
        echo "✅ Database schema is up to date"
    fi
else
    # In development, just warn about pending migrations
    if npx prisma migrate status 2>&1 | grep -q "following migration.*not yet been applied"; then
        echo "⚠️  WARNING: Pending migrations detected!"
        echo "📝 To apply migrations, run: npm run db:deploy"
        echo "🔍 To review migrations first: npx prisma migrate status"
        echo ""
    fi
fi

echo "✅ Generating Prisma Client (safe - no schema changes)..."
npx prisma generate

echo "🚀 Starting server..."
exec node server.js

