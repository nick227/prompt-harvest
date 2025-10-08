# Test Infinite Scroll - PowerShell Script
# Runs Playwright E2E tests for infinite scroll functionality

Write-Host "🧪 Infinite Scroll E2E Test Runner" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "🔍 Checking if server is running on port 3000..." -ForegroundColor Yellow
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    $serverRunning = $true
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Server is NOT running on port 3000" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start your server first:" -ForegroundColor Yellow
    Write-Host "  npm start" -ForegroundColor Cyan
    Write-Host "  OR" -ForegroundColor Yellow
    Write-Host "  node server.js" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host ""
Write-Host "🎭 Running Playwright tests..." -ForegroundColor Yellow
Write-Host ""

# Run the tests
npx playwright test --config=playwright.config.infinite-scroll.js

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 View detailed report:" -ForegroundColor Cyan
Write-Host "  npx playwright show-report playwright-report/infinite-scroll" -ForegroundColor Yellow
Write-Host ""

exit $exitCode

