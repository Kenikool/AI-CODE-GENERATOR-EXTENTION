# 🔑 WHERE TO PUT YOUR GOOGLE GEMINI API KEY

## TL;DR - Quick Answer
Put your Google Gemini API key in **VS Code Settings** under the setting name:
```
aiCodeGenerator.gemini.apiKey
```

---

## 📍 Step-by-Step Instructions

### Step 1: Get Your Google AI API Key
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIzaSy...`)

### Step 2: Open VS Code Settings JSON
**Option A (Recommended):**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `Preferences: Open Settings (JSON)`
3. Press Enter

**Option B:**
1. Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
2. Click the "Open Settings (JSON)" icon (📄) in the top-right corner

### Step 3: Add Your Configuration
Add these lines to your `settings.json` file:

```json
{
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "YOUR_API_KEY_HERE",
  "aiCodeGenerator.gemini.model": "gemini-pro"
}
```

**Replace `YOUR_API_KEY_HERE` with your actual API key!**

### Step 4: Save and Test
1. Save the file (`Ctrl+S` or `Cmd+S`)
2. Open any code file
3. Press `Ctrl+Shift+P` and type "AI Code Generator: Generate Code"
4. Enter a prompt like "create a hello world function"

---

## 📋 Complete Example

Here's what your `settings.json` should look like:

```json
{
  "// Your existing settings": "",
  "editor.fontSize": 14,
  "workbench.colorTheme": "Dark+ (default dark)",
  
  "// AI Code Generator Settings": "",
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "AIzaSyBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890",
  "aiCodeGenerator.gemini.model": "gemini-pro",
  "aiCodeGenerator.temperature": 0.7,
  "aiCodeGenerator.maxTokens": 2048
}
```

---

## 🎯 Alternative: Using VS Code Settings UI

If you prefer the graphical interface:

1. Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
2. Search for "AI Code Generator"
3. Set these values:
   - **Provider**: `gemini`
   - **Gemini: Api Key**: `YOUR_API_KEY_HERE`
   - **Gemini: Model**: `gemini-pro`

---

## 📂 File Locations

Your `settings.json` file is located at:

**Windows:** `%APPDATA%\Code\User\settings.json`
**macOS:** `~/Library/Application Support/Code/User/settings.json`
**Linux:** `~/.config/Code/User/settings.json`

---

## ✅ How to Verify It's Working

After setting up, you should see:
- ✅ No "OpenAI API key not configured" errors
- ✅ AI Code Generator commands work
- ✅ Fast responses from Google Gemini
- ✅ All features work: Generate, Explain, Fix, Test, Refactor, Chat

---

## 🚨 Troubleshooting

### "Google AI API key not configured"
- ✅ Check that you saved `settings.json`
- ✅ Verify the setting name is exactly: `aiCodeGenerator.gemini.apiKey`
- ✅ Make sure the API key is in quotes
- ✅ Restart VS Code

### "Invalid Google AI API key"
- ✅ Double-check your API key from Google AI Studio
- ✅ Make sure you copied the entire key
- ✅ Verify the key is active (not expired)

### Settings Not Taking Effect
- ✅ Restart VS Code completely
- ✅ Check for JSON syntax errors (missing commas, brackets)
- ✅ Try using the Settings UI instead

---

## 🎉 You're All Set!

Once configured, Google Gemini is now your default AI provider. All AI Code Generator features will use Gemini instead of OpenAI.

**Happy coding with Google Gemini! 🚀**