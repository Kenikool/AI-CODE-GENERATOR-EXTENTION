# 🔑 Where to Put Your Google Gemini API Key

## Quick Answer
Put your Google Gemini API key in **VS Code Settings** under `aiCodeGenerator.gemini.apiKey`

## Step-by-Step Instructions

### 1. Get Your Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (it looks like: `AIzaSyA...`)

### 2. Open VS Code Settings
**Method 1 (Recommended):**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Preferences: Open Settings (JSON)"
3. Press Enter

**Method 2:**
1. Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
2. Click the "Open Settings (JSON)" icon in the top-right

### 3. Add Your API Key
Add these lines to your settings.json file:

```json
{
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "AIzaSyA_YOUR_ACTUAL_API_KEY_HERE",
  "aiCodeGenerator.gemini.model": "gemini-pro"
}
```

### 4. Save and Test
1. Save the settings file (`Ctrl+S` or `Cmd+S`)
2. Open any code file
3. Press `Ctrl+Shift+P` and type "AI Code Generator: Generate Code"
4. Enter a prompt like "create a hello world function"

## 🎯 Example Settings

Here's a complete example of what your settings.json should look like:

```json
{
  "// Your existing settings...": "",
  
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "AIzaSyBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890",
  "aiCodeGenerator.gemini.model": "gemini-pro",
  "aiCodeGenerator.temperature": 0.7,
  "aiCodeGenerator.maxTokens": 2048
}
```

## 🔍 Where is settings.json Located?

**Windows:** `%APPDATA%\Code\User\settings.json`
**macOS:** `~/Library/Application Support/Code/User/settings.json`
**Linux:** `~/.config/Code/User/settings.json`

## ✅ Verify It's Working

After setting up, you should see:
- No more "OpenAI API key not configured" errors
- AI Code Generator commands work with Gemini
- Fast responses from Google's AI

## 🚨 Troubleshooting

### "Google AI API key not configured"
- Check that you've saved the settings.json file
- Verify the API key is in quotes
- Make sure there are no typos in the setting name

### "Invalid Google AI API key"
- Double-check your API key from Google AI Studio
- Make sure you copied the entire key
- Verify the key is active (not expired)

### Settings Not Taking Effect
- Restart VS Code
- Check for JSON syntax errors in settings.json
- Use VS Code's settings UI as an alternative

## 🎉 You're All Set!

Once configured, all AI Code Generator features will use Google Gemini:
- Generate Code ✅
- Explain Code ✅
- Fix Code ✅
- Generate Tests ✅
- Refactor Code ✅
- AI Chat ✅

**Happy coding with Google Gemini! 🚀**