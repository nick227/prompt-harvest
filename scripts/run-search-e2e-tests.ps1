# Run Search E2E Tests with Playwright
# PowerShell script for running search functionality e2e tests

Write-Host "🎭 Running Search E2E Tests with Playwright..." -ForegroundColor Cyan
Write-Host ""

# Check if server is running
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3200" -Method Head -TimeoutSec 2 -ErrorAction SilentlyContinue
    $serverRunning = $true
    Write-Host "✅ Server is running on http://localhost:3200" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Server is not running on http://localhost:3200" -ForegroundColor Yellow
    Write-Host "Please start the server first: npm start" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Running tests..." -ForegroundColor Cyan
Write-Host ""

# Run Playwright tests
npx playwright test public/tests/e2e/search-functionality.spec.js --reporter=list

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All E2E tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 View detailed report:" -ForegroundColor Cyan
    Write-Host "npx playwright show-report" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Some E2E tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 View detailed report:" -ForegroundColor Cyan
    Write-Host "npx playwright show-report" -ForegroundColor White
    exit 1
}

