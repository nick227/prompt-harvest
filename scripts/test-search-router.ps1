# Test Search Router
# PowerShell script to run SearchRouter unit tests

Write-Host "🧪 Running SearchRouter Unit Tests..." -ForegroundColor Cyan
Write-Host ""

# Run tests with coverage
npm test -- public/tests/unit/search-router.test.js --coverage --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
}

