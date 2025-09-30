# PowerShell script to sync word_types from local MySQL to Railway MySQL
# Usage: .\scripts\sync-word-types.ps1

Write-Host "🔄 Starting word_types sync to Railway..." -ForegroundColor Cyan

# Check if Railway CLI is installed
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js script exists
$scriptPath = ".\scripts\sync-word-types-railway-cli.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Sync script not found: $scriptPath" -ForegroundColor Red
    exit 1
}

# Run the sync
Write-Host "🚀 Running sync script..." -ForegroundColor Yellow
try {
    node $scriptPath
    Write-Host "✅ Sync completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Sync failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
