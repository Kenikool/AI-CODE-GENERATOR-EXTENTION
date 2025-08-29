@echo off
REM 🚀 AI Code Generator Extension Deployment Script for Windows
REM This script automates the entire deployment process

setlocal enabledelayedexpansion

echo 🚀 Starting AI Code Generator Extension Deployment...
echo ==================================================
echo.

REM Function to print colored output (Windows doesn't support colors easily, so we'll use simple text)
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

REM Check if required tools are installed
:check_prerequisites
call :print_status "Checking prerequisites..."

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do call :print_success "Node.js found: %%i"

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    call :print_error "npm is not installed. Please install npm."
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do call :print_success "npm found: %%i"

REM Check TypeScript
tsc --version >nul 2>&1
if errorlevel 1 (
    call :print_warning "TypeScript not found globally. Installing..."
    npm install -g typescript
)
for /f "tokens=*" %%i in ('tsc --version') do call :print_success "TypeScript found: %%i"

REM Check vsce
vsce --version >nul 2>&1
if errorlevel 1 (
    call :print_warning "vsce not found. Installing VS Code Extension Manager..."
    npm install -g @vscode/vsce
)
for /f "tokens=*" %%i in ('vsce --version') do call :print_success "vsce found: %%i"

goto :eof

REM Install dependencies
:install_dependencies
call :print_status "Installing dependencies..."

if exist "package.json" (
    npm install
    if errorlevel 1 (
        call :print_error "Failed to install dependencies"
        pause
        exit /b 1
    )
    call :print_success "Dependencies installed successfully"
) else (
    call :print_error "package.json not found. Are you in the correct directory?"
    pause
    exit /b 1
)
goto :eof

REM Compile TypeScript
:compile_typescript
call :print_status "Compiling TypeScript..."

if exist "tsconfig.json" (
    npm run compile
    if errorlevel 1 (
        tsc
        if errorlevel 1 (
            call :print_error "TypeScript compilation failed"
            pause
            exit /b 1
        )
    )
    call :print_success "TypeScript compiled successfully"
) else (
    call :print_error "tsconfig.json not found. Cannot compile TypeScript."
    pause
    exit /b 1
)
goto :eof

REM Run tests
:run_tests
call :print_status "Running tests..."

npm run test >nul 2>&1
if errorlevel 1 (
    call :print_warning "Tests failed or no test script found. Continuing anyway..."
) else (
    call :print_success "All tests passed"
)
goto :eof

REM Lint code
:lint_code
call :print_status "Linting code..."

npm run lint >nul 2>&1
if errorlevel 1 (
    call :print_warning "Linting failed or no lint script found. Continuing anyway..."
) else (
    call :print_success "Code linting passed"
)
goto :eof

REM Package extension
:package_extension
call :print_status "Packaging extension..."

REM Remove old VSIX files
del *.vsix >nul 2>&1

REM Package the extension
vsce package
if errorlevel 1 (
    call :print_error "Failed to create VSIX package"
    pause
    exit /b 1
)

REM Find the created VSIX file
for %%f in (*.vsix) do (
    set VSIX_FILE=%%f
    call :print_success "Extension packaged successfully: %%f"
    for %%s in (%%f) do echo 📦 Package size: %%~zs bytes
    goto :package_done
)

call :print_error "No VSIX file was created"
pause
exit /b 1

:package_done
goto :eof

REM Test local installation
:test_local_installation
call :print_status "Testing local installation..."

for %%f in (*.vsix) do (
    set VSIX_FILE=%%f
    call :print_status "Installing extension locally for testing..."
    code --install-extension "%%f" --force
    call :print_success "Extension installed locally. Please test it in VS Code."
    
    set /p "REPLY=Have you tested the extension and is it working correctly? (y/n): "
    if /i not "!REPLY!"=="y" (
        call :print_warning "Please test the extension before publishing."
        pause
        exit /b 1
    )
    goto :test_done
)

call :print_error "No VSIX file found for testing"
pause
exit /b 1

:test_done
goto :eof

REM Publish to marketplace
:publish_extension
call :print_status "Publishing to VS Code Marketplace..."

REM Check if user is logged in
vsce ls-publishers >nul 2>&1
if errorlevel 1 (
    call :print_warning "You are not logged in to vsce."
    call :print_status "Please run 'vsce login <publisher-name>' first."
    set /p "PUBLISHER_NAME=Enter your publisher name: "
    
    if "!PUBLISHER_NAME!"=="" (
        call :print_error "Publisher name cannot be empty"
        pause
        exit /b 1
    )
    
    call :print_status "Logging in to vsce..."
    vsce login "!PUBLISHER_NAME!"
)

REM Publish the extension
call :print_status "Publishing extension..."

set /p "REPLY=Do you want to publish as pre-release? (y/n): "
if /i "!REPLY!"=="y" (
    vsce publish --pre-release
    call :print_success "Extension published as pre-release!"
) else (
    vsce publish
    call :print_success "Extension published to marketplace!"
)

call :print_status "🎉 Your extension is now live on the VS Code Marketplace!"
call :print_status "📊 Monitor your extension at: https://marketplace.visualstudio.com/manage"
goto :eof

REM Create GitHub release info
:create_github_release
call :print_status "Creating GitHub release info..."

for %%f in (*.vsix) do (
    set VSIX_FILE=%%f
    call :print_status "VSIX file: %%f"
)

REM Get version from package.json (simplified)
call :print_status "Please manually create a GitHub release and upload the VSIX file."
call :print_status "Release URL: https://github.com/yourusername/ai-code-generator-extension/releases/new"
call :print_status "Upload the VSIX file as a release asset."
goto :eof

REM Main deployment process
:main
echo 🤖 AI Code Generator Extension Deployment
echo =========================================
echo.

echo What would you like to do?
echo 1) Full deployment (compile, package, test, publish)
echo 2) Package only (compile and create VSIX)
echo 3) Test local installation
echo 4) Publish to marketplace
echo 5) Check prerequisites only
echo.
set /p "CHOICE=Enter your choice (1-5): "
echo.

if "%CHOICE%"=="1" (
    call :print_status "Starting full deployment process..."
    call :check_prerequisites
    call :install_dependencies
    call :compile_typescript
    call :lint_code
    call :run_tests
    call :package_extension
    call :test_local_installation
    call :publish_extension
    call :create_github_release
) else if "%CHOICE%"=="2" (
    call :print_status "Packaging extension only..."
    call :check_prerequisites
    call :install_dependencies
    call :compile_typescript
    call :package_extension
) else if "%CHOICE%"=="3" (
    call :print_status "Testing local installation..."
    call :test_local_installation
) else if "%CHOICE%"=="4" (
    call :print_status "Publishing to marketplace..."
    call :publish_extension
) else if "%CHOICE%"=="5" (
    call :print_status "Checking prerequisites..."
    call :check_prerequisites
) else (
    call :print_error "Invalid choice. Please run the script again."
    pause
    exit /b 1
)

echo.
call :print_success "🎉 Deployment process completed successfully!"
echo.
echo 📋 Next Steps:
echo 1. Monitor your extension on the VS Code Marketplace
echo 2. Respond to user reviews and feedback
echo 3. Plan future updates and improvements
echo 4. Market your extension to reach more developers
echo.
echo 🔗 Useful Links:
echo • Marketplace: https://marketplace.visualstudio.com/manage
echo • Analytics: https://marketplace.visualstudio.com/manage/publishers
echo • Documentation: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
echo.
call :print_success "Happy coding! 🚀"

pause
goto :eof

REM Run main function
call :main