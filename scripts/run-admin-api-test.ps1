# Admin API E2E Test Runner - PowerShell Script
# Simple script to run the admin API E2E tests

Write-Host "🚀 Starting Admin API E2E Tests..." -ForegroundColor Green
Write-Host ""

# Set environment variables
$env:NODE_ENV = "test"
$env:TEST_BASE_URL = "http://localhost:3000"

# Check if server is running
Write-Host "🔍 Checking if server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start the server first:" -ForegroundColor Red
    Write-Host "   npm start" -ForegroundColor Yellow
    Write-Host "   or" -ForegroundColor Yellow
    Write-Host "   node server.js" -ForegroundColor Yellow
    exit 1
}

# Run the manual test
Write-Host ""
Write-Host "🧪 Running manual E2E tests..." -ForegroundColor Yellow
Write-Host ""

try {
    node scripts/test-admin-api-manual.js

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Admin API E2E Tests completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Admin API E2E Tests failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running E2E tests: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Test execution completed!" -ForegroundColor Green
