#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Migrates uploads from public/uploads to storage/uploads for security fix
.DESCRIPTION
    This script safely moves all uploaded images from the old public location
    to the new protected storage location.
.NOTES
    Author: Security Team
    Date: 2025-10-09
#>

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Upload Security Migration Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if source directory exists
if (-not (Test-Path "public\uploads")) {
    Write-Host "✅ Source directory 'public\uploads' does not exist - nothing to migrate" -ForegroundColor Green
    exit 0
}

# Create destination directory
Write-Host "📁 Creating destination directory 'storage\uploads'..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "storage\uploads" -Force | Out-Null

# Count files to migrate
$files = Get-ChildItem -Path "public\uploads" -File -ErrorAction SilentlyContinue
$fileCount = $files.Count

if ($fileCount -eq 0) {
    Write-Host "✅ No files to migrate" -ForegroundColor Green
    exit 0
}

Write-Host "📊 Found $fileCount files to migrate" -ForegroundColor Yellow
Write-Host ""

# Ask for confirmation
$response = Read-Host "Do you want to proceed with migration? (Y/N)"
if ($response -ne "Y" -and $response -ne "y") {
    Write-Host "❌ Migration cancelled by user" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting migration..." -ForegroundColor Cyan

# Copy files
$copied = 0
$errors = 0

foreach ($file in $files) {
    try {
        Copy-Item -Path $file.FullName -Destination "storage\uploads\" -Force
        $copied++

        if ($copied % 100 -eq 0) {
            Write-Host "   Migrated $copied / $fileCount files..." -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "   ⚠️ Error copying $($file.Name): $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ Successfully migrated: $copied files" -ForegroundColor Green

if ($errors -gt 0) {
    Write-Host "⚠️ Errors encountered: $errors files" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Verify the application works correctly" -ForegroundColor White
Write-Host "   2. After verification, you can safely delete 'public\uploads'" -ForegroundColor White
Write-Host "   3. Run: Remove-Item -Path 'public\uploads' -Recurse -Force" -ForegroundColor Gray
Write-Host ""

# Verify migration
$destFiles = Get-ChildItem -Path "storage\uploads" -File -ErrorAction SilentlyContinue
Write-Host "📊 Destination has $($destFiles.Count) files" -ForegroundColor Cyan

if ($destFiles.Count -eq $fileCount) {
    Write-Host "✅ File count matches - migration successful!" -ForegroundColor Green
} else {
    Write-Host "⚠️ File count mismatch - please verify manually" -ForegroundColor Yellow
}

Write-Host ""

