#!/bin/sh
set -e

echo "Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration failed with exit code $?, attempting to resolve..."
  
  # Try to mark the problematic migration as resolved
  echo "Attempting to resolve failed migration..."
  npx prisma migrate resolve --rolled-back "20250917081252_initial_complete_schema" || true
  
  # Try migrations again
  echo "Retrying migrations..."
  npx prisma migrate deploy || echo "⚠️  Migrations still failing, proceeding anyway..."
fi

echo "Starting server..."
exec node server.js

