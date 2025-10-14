#!/bin/sh
set -e

echo "🔍 Checking migration status..."
echo ""

# Show current migration status
npx prisma migrate status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  IMPORTANT: Review migrations above before proceeding!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚨 Destructive operations to watch for:"
echo "   - DROP COLUMN (data loss)"
echo "   - DROP TABLE (data loss)"
echo "   - RENAME COLUMN (potential data loss)"
echo "   - ALTER COLUMN TYPE (data conversion issues)"
echo ""
echo "📝 To review migration SQL files:"
echo "   ls -la prisma/migrations/"
echo ""
echo "Press Ctrl+C to cancel, or"
read -p "Type 'APPLY' to proceed with migrations: " confirm

if [ "$confirm" = "APPLY" ]; then
    echo ""
    echo "🔄 Applying migrations..."
    npx prisma migrate deploy
    echo ""
    echo "✅ Migrations completed successfully!"
    echo "🔄 Regenerating Prisma Client..."
    npx prisma generate
    echo "✅ Done!"
else
    echo ""
    echo "❌ Migration cancelled (you typed: '$confirm')"
    echo "   Expected: 'APPLY'"
    exit 1
fi

