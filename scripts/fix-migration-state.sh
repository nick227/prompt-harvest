#!/bin/sh
# Fix Migration State Script
# Run this in Railway shell if migrations are stuck: railway shell
# Then run: sh scripts/fix-migration-state.sh

set -e

echo "🔧 Fixing migration state..."
echo ""

# Check current migration status
echo "📋 Current migration status:"
npx prisma migrate status
echo ""

# Resolve failed initial migration
echo "✅ Marking initial schema as applied..."
npx prisma migrate resolve --applied "20250917081252_initial_complete_schema" 2>&1 || echo "  (Already resolved or doesn't exist)"

# Resolve incorrectly-dated migration
echo "✅ Rolling back incorrectly-dated migration..."
npx prisma migrate resolve --rolled-back "20250117000000_add_blog_posts_and_api_requests" 2>&1 || echo "  (Already resolved or doesn't exist)"

# Mark all existing migrations as applied
echo "✅ Marking migrations as applied..."
npx prisma migrate resolve --applied "20251003102644_increase_stripe_payment_id_length" 2>&1 || echo "  (Already applied or doesn't exist)"
npx prisma migrate resolve --applied "20251008153822_add_missing_tables_and_columns" 2>&1 || echo "  (Already applied or doesn't exist)"
npx prisma migrate resolve --applied "20251009021500_add_blog_posts_and_api_requests" 2>&1 || echo "  (Already applied or doesn't exist)"
npx prisma migrate resolve --applied "20251009035920_add_image_performance_indexes" 2>&1 || echo "  (Already applied or doesn't exist)"

echo ""
echo "🔄 Deploying any pending migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migration state fixed!"
echo ""
echo "📋 Final migration status:"
npx prisma migrate status

