@echo off
echo 🔍 Checking AI Code Generator Extension Status
echo.
echo 📦 Local Package Information:
echo Current directory: %CD%
if exist "kenikool-ai-code-generator-1.0.1.vsix" (
    echo ✅ VSIX file exists: kenikool-ai-code-generator-1.0.1.vsix
) else (
    echo ❌ VSIX file not found
)
echo.
echo 🌐 Marketplace Status:
echo Extension URL: https://marketplace.visualstudio.com/items?itemName=KENIKOOL-TECH.kenikool-ai-code-generator
echo.
echo 🔧 Quick Actions:
echo.
echo 1. Install from local VSIX (immediate):
echo    code --install-extension kenikool-ai-code-generator-1.0.1.vsix
echo.
echo 2. Install from marketplace (may take 5-15 minutes):
echo    code --install-extension KENIKOOL-TECH.kenikool-ai-code-generator
echo.
echo 3. Force VS Code to reload:
echo    - Press Ctrl+Shift+P in VS Code
echo    - Type "Developer: Reload Window"
echo    - Press Enter
echo.
echo 4. Check marketplace directly:
echo    - Open: https://marketplace.visualstudio.com/items?itemName=KENIKOOL-TECH.kenikool-ai-code-generator
echo    - Should show version 1.0.1
echo.
echo ⏰ Timeline:
echo - Immediate: VSIX file installation works
echo - 5-15 min: Marketplace search finds new version
echo - 15-30 min: All VS Code instances see update
echo.
echo 🎯 To test the fixes immediately:
echo 1. Run: code --install-extension kenikool-ai-code-generator-1.0.1.vsix
echo 2. Restart VS Code
echo 3. Open AI Code Generator sidebar
echo 4. Dashboard should show content (not empty)
echo 5. AI Chat should work (not blank)
echo.
pause