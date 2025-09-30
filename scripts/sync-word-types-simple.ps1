# Simple PowerShell script for word_types sync
# This script provides multiple options for syncing

Write-Host "🔄 Word Types Sync Options" -ForegroundColor Cyan
Write-Host ""

# Check what's available
$mysqlAvailable = $false
$railwayAvailable = $false

try {
    $null = Get-Command mysql -ErrorAction Stop
    $mysqlAvailable = $true
    Write-Host "✅ MySQL client found" -ForegroundColor Green
} catch {
    Write-Host "❌ MySQL client not found" -ForegroundColor Red
}

try {
    $railwayVersion = railway --version
    $railwayAvailable = $true
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found" -ForegroundColor Red
}

Write-Host ""

if ($mysqlAvailable -and $railwayAvailable) {
    Write-Host "🚀 Option 1: Direct MySQL sync (recommended)" -ForegroundColor Yellow
    Write-Host "   Run: node scripts/sync-word-types-railway-working.js" -ForegroundColor White
    Write-Host ""
}

Write-Host "🚀 Option 2: Deployment-based sync (always works)" -ForegroundColor Yellow
Write-Host "   Run: node scripts/sync-word-types-deployment.js" -ForegroundColor White
Write-Host "   This creates a sync script that runs on Railway" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 Option 3: Manual Railway CLI sync" -ForegroundColor Yellow
Write-Host "   1. Export data: node scripts/test-word-types-sync.js > local-data.json" -ForegroundColor White
Write-Host "   2. Use Railway dashboard to run SQL" -ForegroundColor White
Write-Host ""

# Ask user which option they prefer
Write-Host "Which option would you like to use?" -ForegroundColor Cyan
Write-Host "1) Direct MySQL sync (requires MySQL client)" -ForegroundColor White
Write-Host "2) Deployment-based sync (recommended)" -ForegroundColor White
Write-Host "3) Manual sync instructions" -ForegroundColor White
Write-Host "4) Exit" -ForegroundColor White

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        if ($mysqlAvailable -and $railwayAvailable) {
            Write-Host "🚀 Running direct MySQL sync..." -ForegroundColor Green
            node scripts/sync-word-types-railway-working.js
        } else {
            Write-Host "❌ Requirements not met for direct sync" -ForegroundColor Red
        }
    }
    "2" {
        Write-Host "🚀 Preparing deployment-based sync..." -ForegroundColor Green
        node scripts/sync-word-types-deployment.js
    }
    "3" {
        Write-Host "📋 Manual sync instructions:" -ForegroundColor Yellow
        Write-Host "1. Run: node scripts/test-word-types-sync.js" -ForegroundColor White
        Write-Host "2. Copy the local data output" -ForegroundColor White
        Write-Host "3. Go to Railway dashboard" -ForegroundColor White
        Write-Host "4. Open MySQL console" -ForegroundColor White
        Write-Host "5. Run the SQL commands manually" -ForegroundColor White
    }
    "4" {
        Write-Host "👋 Goodbye!" -ForegroundColor Green
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}
