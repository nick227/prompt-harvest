# Test Search API - PowerShell Script
# Runs E2E and unit tests for search functionality

Write-Host "🧪 Running Search API Tests..." -ForegroundColor Cyan
Write-Host ""

# Check if Jest is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

# Run unit tests
Write-Host "📦 Running Unit Tests..." -ForegroundColor Yellow
npm test -- tests/unit/searchController.test.js --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Unit tests failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Unit tests passed!" -ForegroundColor Green
Write-Host ""

# Run E2E tests
Write-Host "🌐 Running E2E Tests..." -ForegroundColor Yellow
npm test -- tests/e2e/search-api.test.js --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ E2E tests failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ E2E tests passed!" -ForegroundColor Green
Write-Host ""

# Run with coverage
Write-Host "📊 Running Tests with Coverage..." -ForegroundColor Yellow
npm test -- tests/unit/searchController.test.js tests/e2e/search-api.test.js --coverage

Write-Host ""
Write-Host "🎉 All search tests passed!" -ForegroundColor Green

