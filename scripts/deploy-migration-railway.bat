@echo off
echo 🚀 Starting Railway Migration Deployment...
echo.

REM Check if Railway CLI is available
echo 🔍 Checking Railway CLI...
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Please install it first:
    echo    npm install -g @railway/cli
    pause
    exit /b 1
)
echo ✅ Railway CLI found
echo.

REM Check Railway connection
echo 🔍 Checking Railway connection...
railway status >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway connection failed. Please login first:
    echo    railway login
    pause
    exit /b 1
)
echo ✅ Railway connection verified
echo.

REM Check if migration file exists
if not exist "prisma\migrations\20250117000000_add_blog_posts_and_api_requests\migration.sql" (
    echo ❌ Migration file not found
    pause
    exit /b 1
)
echo ✅ Migration file found
echo.

REM Execute migration
echo 🚀 Executing migration on Railway...
echo.
railway connect mysql < "prisma\migrations\20250117000000_add_blog_posts_and_api_requests\migration.sql"
if %errorlevel% neq 0 (
    echo ❌ Migration execution failed
    pause
    exit /b 1
)
echo ✅ Migration executed successfully
echo.

REM Verify migration
echo 🔍 Verifying migration...
echo.
echo SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('blog_posts', 'api_requests') ORDER BY TABLE_NAME; > temp_verify.sql
railway connect mysql < temp_verify.sql
del temp_verify.sql
echo.

echo ✨ Migration deployment completed successfully!
echo 📊 New tables created: blog_posts, api_requests
echo.
echo Next steps:
echo 1. Test your application with the new tables
echo 2. Commit and push your changes to trigger Railway deployment
echo 3. Monitor your application for any issues
echo.
pause
