#!/bin/sh
set -e

echo "Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration failed, attempting to resolve..."

  # Try to resolve the old incorrectly-dated migration that may still be in the database
  echo "Resolving incorrectly-dated migration..."
  npx prisma migrate resolve --rolled-back "20250117000000_add_blog_posts_and_api_requests" 2>/dev/null || true

  # Mark the new correctly-dated migration as applied if tables already exist
  echo "Marking new migration as applied..."
  npx prisma migrate resolve --applied "20251009021500_add_blog_posts_and_api_requests" 2>/dev/null || true

  # Try migrations again
  echo "Retrying migrations..."
  npx prisma migrate deploy || echo "⚠️  Migrations still failing, proceeding anyway..."
fi

echo "Starting server..."
exec node server.js

