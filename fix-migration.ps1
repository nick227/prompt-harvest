# Fix failed Prisma migration on Railway
Write-Host "🔧 Fixing failed Prisma migration..." -ForegroundColor Yellow

# Mark the failed migration as resolved
Write-Host "📝 Marking migration as resolved..." -ForegroundColor Blue
npx prisma migrate resolve --applied 20250115000000_add_isSuspended_field

# Deploy remaining migrations
Write-Host "🚀 Deploying remaining migrations..." -ForegroundColor Blue
npx prisma migrate deploy

Write-Host "✅ Migration fix complete!" -ForegroundColor Green
