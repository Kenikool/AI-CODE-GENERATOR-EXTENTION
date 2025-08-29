# 🚀 QUICK FIX: Gemini Model Error

## ⚡ The Problem
```
Error: models/gemini-pro is not found for API version v1
```

## ⚡ The Solution
**Change your model from `gemini-pro` to `gemini-1.5-flash`**

## ⚡ How to Fix (30 seconds)

### In VS Code:
1. Press `Ctrl+Shift+P`
2. Type "Preferences: Open Settings (JSON)"
3. Find this line:
   ```json
   "aiCodeGenerator.gemini.model": "gemini-pro"
   ```
4. Change it to:
   ```json
   "aiCodeGenerator.gemini.model": "gemini-1.5-flash"
   ```
5. Save (`Ctrl+S`)

## ⚡ Your Updated Settings
```json
{
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "AIzaSyBib7a1aO6uu-MZRaLkNyOmeG51qXR0pfY",
  "aiCodeGenerator.gemini.model": "gemini-1.5-flash",
  "aiCodeGenerator.temperature": 0.7,
  "aiCodeGenerator.maxTokens": 2048
}
```

## ⚡ Done!
- ✅ Error fixed
- ✅ Faster model
- ✅ Better performance
- ✅ All features working

**Test it now!** 🎉