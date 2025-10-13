# Run all 5 search test modules on Chromium only
# This script runs each module sequentially and provides a summary

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RUNNING ALL 5 SEARCH TEST MODULES" -ForegroundColor Cyan
Write-Host "Browser: Chromium only" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$modules = @(
    @{Name="Module 1: API Response"; Number="1-api"},
    @{Name="Module 2: DOM Rendering"; Number="2-dom"},
    @{Name="Module 3: Filter Logic"; Number="3-filters"},
    @{Name="Module 4: Indicator Display"; Number="4-indicator"},
    @{Name="Module 5: Search Matching"; Number="5-matching"}
)

$results = @()

foreach ($module in $modules) {
    Write-Host "`n--------------------------------------------------" -ForegroundColor Yellow
    Write-Host "Running: $($module.Name)" -ForegroundColor Yellow
    Write-Host "--------------------------------------------------`n" -ForegroundColor Yellow

    $output = npm run test:search:$($module.Number) 2>&1 | Out-String

    # Extract pass/fail count
    if ($output -match "(\d+) passed") {
        $passed = $matches[1]
    } else {
        $passed = 0
    }

    if ($output -match "(\d+) failed") {
        $failed = $matches[1]
    } else {
        $failed = 0
    }

    $results += @{
        Name = $module.Name
        Passed = $passed
        Failed = $failed
        Status = if ($failed -eq 0) { "PASS" } else { "FAIL" }
    }

    Write-Host $output
}

# Print summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY OF ALL MODULES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$totalPassed = 0
$totalFailed = 0

foreach ($result in $results) {
    $totalPassed += [int]$result.Passed
    $totalFailed += [int]$result.Failed

    $statusColor = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    $statusSymbol = if ($result.Status -eq "PASS") { "✅" } else { "❌" }

    Write-Host "$statusSymbol $($result.Name)" -ForegroundColor $statusColor
    Write-Host "   Passed: $($result.Passed) | Failed: $($result.Failed)`n" -ForegroundColor Gray
}

Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "TOTAL: $totalPassed passed | $totalFailed failed" -ForegroundColor Cyan
Write-Host "--------------------------------------------------`n" -ForegroundColor Cyan

# Check for report files
Write-Host "`nChecking report files..." -ForegroundColor Yellow
$reportFiles = @(
    "tests/reports/expected-counts.json",
    "tests/reports/module-2-dom-report.json",
    "tests/reports/module-3-filter-report.json",
    "tests/reports/module-4-indicator-report.json",
    "tests/reports/module-5-matching-report.json"
)

foreach ($file in $reportFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file (not found)" -ForegroundColor Red
    }
}

# Show expected counts if available
if (Test-Path "tests/reports/expected-counts.json") {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "EXPECTED COUNTS FROM MODULE 1" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    $counts = Get-Content "tests/reports/expected-counts.json" | ConvertFrom-Json
    Write-Host "Total images: $($counts.total)" -ForegroundColor White
    Write-Host "Public images: $($counts.public)" -ForegroundColor Green
    Write-Host "Private images: $($counts.private)" -ForegroundColor Blue
    Write-Host "Timestamp: $($counts.timestamp)`n" -ForegroundColor Gray
}

if ($totalFailed -eq 0) {
    Write-Host "`n🎉 ALL MODULES PASSED! Search verification complete!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some modules failed. Review the output above for details." -ForegroundColor Yellow
}

