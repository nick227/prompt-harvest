# PowerShell script to remove console logs from all JavaScript files in src/
# This script removes console.log, console.info, console.warn, and console.debug statements
# but preserves console.error statements for error handling

Write-Host "🧹 Starting console log cleanup across src/ directory..."

# Get all JavaScript files in src/ directory
$jsFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.js" | Where-Object { $_.Name -notlike "*test*" -and $_.Name -notlike "*spec*" }

$totalFiles = $jsFiles.Count
$processedFiles = 0
$removedLogs = 0

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalLines = ($content -split "`n").Count

    # Remove console.log, console.info, console.warn, console.debug lines
    # but keep console.error lines for error handling
    $newContent = $content -replace '^\s*console\.(log|info|warn|debug)\(.*?\);\s*$', '' -replace '^\s*console\.(log|info|warn|debug)\(.*?\);\s*$', ''

    # Clean up empty lines that might be left behind
    $newContent = $newContent -replace '(?m)^\s*$\n', ''

    $newLines = ($newContent -split "`n").Count
    $removedInFile = $originalLines - $newLines

    if ($removedInFile -gt 0) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $removedLogs += $removedInFile
        Write-Host "✅ Cleaned $removedInFile console logs from $($file.Name)"
    }

    $processedFiles++
    Write-Progress -Activity "Cleaning console logs" -Status "Processing files" -PercentComplete (($processedFiles / $totalFiles) * 100)
}

Write-Host "🎉 Console log cleanup completed!"
Write-Host "📊 Processed $processedFiles files"
Write-Host "🗑️ Removed $removedLogs console log statements"
Write-Host "✅ Preserved console.error statements for error handling"
