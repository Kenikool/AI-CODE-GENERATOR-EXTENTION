@echo off
echo 🚀 AI Code Generator Extension Update Helper
echo.
echo 📦 Current version: 1.0.0
echo 💡 Suggested new version: 1.0.1 (patch update for bug fixes)
echo.
echo 🔧 Update Process:
echo 1. Update version in package.json
echo 2. Compile TypeScript
echo 3. Package extension
echo 4. Publish to marketplace
echo.
echo 📋 STEP 1: Update package.json
echo Please manually edit package.json and change:
echo   "version": "1.0.0"  to  "version": "1.0.1"
echo.
pause
echo.
echo 📋 STEP 2: Compile and Build
echo Running compilation...
call npm run compile
if %errorlevel% neq 0 (
    echo ❌ Compilation failed! Please fix errors and try again.
    pause
    exit /b 1
)
echo ✅ Compilation successful!
echo.
echo 📋 STEP 3: Package Extension
echo Creating package...
call npm run package
if %errorlevel% neq 0 (
    echo ❌ Packaging failed! Please check for errors.
    pause
    exit /b 1
)
echo ✅ Package created successfully!
echo.
echo 📋 STEP 4: Publish to Marketplace
echo.
echo ⚠️  IMPORTANT: Make sure you're logged in to vsce
echo If not logged in, run: vsce login KENIKOOL-TECH
echo.
set /p confirm="Ready to publish? (y/n): "
if /i "%confirm%"=="y" (
    echo Publishing extension...
    call npm run publish
    if %errorlevel% neq 0 (
        echo ❌ Publishing failed! Check your authentication and try again.
        pause
        exit /b 1
    )
    echo ✅ Extension published successfully!
    echo.
    echo 🎉 Update Complete!
    echo Your extension v1.0.1 is now live on the VS Code Marketplace!
    echo.
    echo ✨ What users will get:
    echo - Working dashboard with project information
    echo - Functional AI chat interface
    echo - Setup wizard for API configuration
    echo - Better error messages and guidance
) else (
    echo Update cancelled. You can publish later with: npm run publish
)
echo.
pause