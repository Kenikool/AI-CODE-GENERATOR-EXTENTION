@echo off
echo Compiling TypeScript...
npx tsc -p ./
echo.
echo Compilation complete!
echo.
echo Checking if Gemini is now supported...
findstr /C:"case 'gemini'" out\aiProvider.js
if %errorlevel% == 0 (
    echo ✅ Gemini support found in compiled code!
) else (
    echo ❌ Gemini support not found in compiled code
)
pause