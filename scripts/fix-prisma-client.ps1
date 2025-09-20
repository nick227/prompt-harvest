# Fix Prisma Client Script
# This script stops the server, regenerates the Prisma client, and restarts the server

Write-Host "🔄 Fixing Prisma Client..." -ForegroundColor Yellow

# Stop any running Node.js processes (server)
Write-Host "⏹️ Stopping server..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment for processes to stop
Start-Sleep -Seconds 2

# Navigate to project directory
Set-Location "C:\wamp64\www\image-harvest"

# Remove existing Prisma client
Write-Host "🗑️ Removing existing Prisma client..." -ForegroundColor Blue
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma"
}

# Regenerate Prisma client
Write-Host "🔧 Regenerating Prisma client..." -ForegroundColor Blue
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma client regenerated successfully!" -ForegroundColor Green

    # Start the server
    Write-Host "🚀 Starting server..." -ForegroundColor Blue
    npm start
} else {
    Write-Host "❌ Failed to regenerate Prisma client" -ForegroundColor Red
    Write-Host "Please run 'npx prisma generate' manually" -ForegroundColor Yellow
}
