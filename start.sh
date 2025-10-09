#!/bin/sh
set -e

echo "Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration failed, attempting to resolve..."

  # Resolve the initial failed migration (if it exists and tables are already created)
  echo "Resolving initial schema migration..."
  npx prisma migrate resolve --applied "20250917081252_initial_complete_schema" 2>/dev/null || true

  # Try to resolve the old incorrectly-dated migration that may still be in the database
  echo "Resolving incorrectly-dated migration..."
  npx prisma migrate resolve --rolled-back "20250117000000_add_blog_posts_and_api_requests" 2>/dev/null || true

  # Mark the new correctly-dated migration as applied if tables already exist
  echo "Marking new migration as applied..."
  npx prisma migrate resolve --applied "20251009021500_add_blog_posts_and_api_requests" 2>/dev/null || true

  # Mark other migrations as applied if tables exist
  echo "Marking other migrations as applied..."
  npx prisma migrate resolve --applied "20251003102644_increase_stripe_payment_id_length" 2>/dev/null || true
  npx prisma migrate resolve --applied "20251008153822_add_missing_tables_and_columns" 2>/dev/null || true
  npx prisma migrate resolve --applied "20251009035920_add_image_performance_indexes" 2>/dev/null || true

  # Try migrations again
  echo "Retrying migrations..."
  npx prisma migrate deploy || echo "⚠️  Migrations still failing, proceeding anyway..."
fi

echo "Starting server..."
exec node server.js

