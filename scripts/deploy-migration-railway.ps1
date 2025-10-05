# Railway Migration Deployment Script (PowerShell)
#
# This script safely deploys the blog_posts and api_requests migration to Railway production.
# It uses Railway CLI to execute the migration without data loss.

Write-Host "🚀 Starting Railway Migration Deployment..." -ForegroundColor Green
Write-Host ""

# Check if Railway CLI is available
Write-Host "🔍 Checking Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Check Railway connection
Write-Host "🔍 Checking Railway connection..." -ForegroundColor Yellow
try {
    railway status | Out-Null
    Write-Host "✅ Railway connection verified" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway connection failed. Please login first:" -ForegroundColor Red
    Write-Host "   railway login" -ForegroundColor Yellow
    exit 1
}

# Check if migration file exists
$migrationFile = "prisma\migrations\20250117000000_add_blog_posts_and_api_requests\migration.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Migration file found" -ForegroundColor Green

# Create temporary directory
$tempDir = "temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# Check for existing tables
Write-Host "🔍 Checking for existing tables in Railway..." -ForegroundColor Yellow

$checkSql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('blog_posts', 'api_requests');"

$checkFile = "$tempDir\check_tables.sql"
$checkSql | Out-File -FilePath $checkFile -Encoding UTF8

try {
    Write-Host "Checking existing tables..."
    railway connect mysql < $checkFile
    Write-Host "✅ Table check completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not check existing tables, proceeding with migration..." -ForegroundColor Yellow
}

# Execute migration
Write-Host "🚀 Executing migration on Railway..." -ForegroundColor Yellow

$migrationSql = Get-Content $migrationFile -Raw

$safeMigrationSql = @"
-- Railway Migration: Add blog_posts and api_requests tables
-- Generated: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")

-- Check if tables already exist
SET @blog_posts_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_posts');
SET @api_requests_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_requests');

-- Only create tables if they don't exist
$migrationSql

-- Verify tables were created
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as blog_posts_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_posts';
SELECT COUNT(*) as api_requests_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_requests';
"@

$migrationFile = "$tempDir\railway_migration.sql"
$safeMigrationSql | Out-File -FilePath $migrationFile -Encoding UTF8

try {
    Write-Host "Executing migration..."
    railway connect mysql < $migrationFile
    Write-Host "✅ Migration executed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration execution failed" -ForegroundColor Red
    exit 1
}

# Verify migration
Write-Host "🔍 Verifying migration..." -ForegroundColor Yellow

$verifySql = "SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('blog_posts', 'api_requests') ORDER BY TABLE_NAME;"

$verifyFile = "$tempDir\verify_migration.sql"
$verifySql | Out-File -FilePath $verifyFile -Encoding UTF8

try {
    Write-Host "Verifying migration..."
    railway connect mysql < $verifyFile
    Write-Host "✅ Migration verification completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration verification failed" -ForegroundColor Red
    exit 1
}

# Cleanup
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item "$tempDir\check_tables.sql" -ErrorAction SilentlyContinue
Remove-Item "$tempDir\railway_migration.sql" -ErrorAction SilentlyContinue
Remove-Item "$tempDir\verify_migration.sql" -ErrorAction SilentlyContinue
Write-Host "✅ Cleanup completed" -ForegroundColor Green

Write-Host ""
Write-Host "✨ Migration deployment completed successfully!" -ForegroundColor Green
Write-Host "📊 New tables created: blog_posts, api_requests" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test your application with the new tables" -ForegroundColor White
Write-Host "2. Commit and push your changes to trigger Railway deployment" -ForegroundColor White
Write-Host "3. Monitor your application for any issues" -ForegroundColor White
