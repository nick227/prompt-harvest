# Railway build script with migration fix and data sync
Write-Host "🚀 Starting Railway build process..." -ForegroundColor Yellow

# Step 1: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Step 2: Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
npx prisma generate

# Step 3: Fix failed migration
Write-Host "🔧 Fixing failed migration..." -ForegroundColor Blue
npx prisma migrate resolve --applied 20250115000000_add_isSuspended_field

# Step 4: Deploy migrations
Write-Host "📦 Deploying migrations..." -ForegroundColor Blue
npx prisma migrate deploy

# Step 5: Import critical data (if data-export.json exists)
if (Test-Path "data-export.json") {
    Write-Host "📥 Importing critical data..." -ForegroundColor Blue
    node scripts/railway-deploy-with-data.js
} else {
    Write-Host "⚠️ No data export file found, skipping data import" -ForegroundColor Yellow
}

Write-Host "✅ Railway build completed successfully!" -ForegroundColor Green
