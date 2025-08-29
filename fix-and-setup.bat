@echo off
echo 🔧 Fixing "Unsupported AI provider" Error...
echo.

echo Step 1: Installing Google Generative AI package...
npm install @google/generative-ai
echo.

echo Step 2: Testing the fix...
node test-provider-fix.js
echo.

echo Step 3: Verifying setup...
node verify-setup.js
echo.

echo ✅ Fix Complete!
echo.
echo 🔑 NEXT: Add your Google AI API key to VS Code settings:
echo    1. Press Ctrl+Shift+P in VS Code
echo    2. Type "Preferences: Open Settings (JSON)"
echo    3. Add this configuration:
echo.
echo    {
echo      "aiCodeGenerator.provider": "gemini",
echo      "aiCodeGenerator.gemini.apiKey": "YOUR_API_KEY_HERE",
echo      "aiCodeGenerator.gemini.model": "gemini-pro"
echo    }
echo.
echo 🌐 Get your API key from: https://makersuite.google.com/app/apikey
echo.
pause