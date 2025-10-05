# Batch Processing PowerShell Runner
# Easy script to run batch processing operations

param(
    [string]$Command = "both",
    [switch]$Help
)

if ($Help) {
    Write-Host "🚀 Batch Processing PowerShell Runner" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\run-batch.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  images  - Run image generation batch only" -ForegroundColor White
    Write-Host "  blogs   - Run blog creation batch only" -ForegroundColor White
    Write-Host "  both    - Run both batches (default)" -ForegroundColor White
    Write-Host "  help    - Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\run-batch.ps1 images" -ForegroundColor White
    Write-Host "  .\run-batch.ps1 blogs" -ForegroundColor White
    Write-Host "  .\run-batch.ps1 both" -ForegroundColor White
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  - Custom image requests: image-requests.json" -ForegroundColor White
    Write-Host "  - Custom blog requests: blog-requests.json" -ForegroundColor White
    Write-Host "  - Results saved to: current directory" -ForegroundColor White
    exit 0
}

Write-Host "🚀 Starting Batch Processing..." -ForegroundColor Green
Write-Host "Command: $Command" -ForegroundColor Yellow
Write-Host ""

# Check if server is running
Write-Host "🔍 Checking if server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3200" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start the server first:" -ForegroundColor Red
    Write-Host "   npm start" -ForegroundColor Yellow
    Write-Host "   or" -ForegroundColor Yellow
    Write-Host "   node server.js" -ForegroundColor Yellow
    exit 1
}

# Run the batch processing
Write-Host ""
Write-Host "🧪 Running batch processing..." -ForegroundColor Yellow
Write-Host ""

try {
    switch ($Command.ToLower()) {
        "images" {
            Write-Host "🖼️ Running image generation batch..." -ForegroundColor Cyan
            node run-batch-processing.js images
        }
        "blogs" {
            Write-Host "📝 Running blog creation batch..." -ForegroundColor Cyan
            node run-batch-processing.js blogs
        }
        "both" {
            Write-Host "🚀 Running both image generation and blog creation batches..." -ForegroundColor Cyan
            node run-batch-processing.js both
        }
        default {
            Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
            Write-Host "Use -Help to see available commands" -ForegroundColor Yellow
            exit 1
        }
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Batch processing completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Batch processing failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running batch processing: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Batch processing execution completed!" -ForegroundColor Green
