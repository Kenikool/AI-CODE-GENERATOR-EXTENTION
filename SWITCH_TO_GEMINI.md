# How to Switch from OpenAI to Google Gemini

## Quick Setup (5 minutes)

### Step 1: Get Your Google AI API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key (keep it safe!)

### Step 2: Configure VS Code
1. Open VS Code
2. Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac) to open Settings
3. Search for "AI Code Generator"
4. Change these settings:

```json
{
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "YOUR_API_KEY_HERE",
  "aiCodeGenerator.gemini.model": "gemini-pro"
}
```

### Step 3: Test It!
1. Open any code file
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. Type "AI Code Generator: Generate Code"
4. Enter a prompt like: "Create a function to calculate fibonacci numbers"
5. Watch Gemini generate your code! 🎉

## Why Switch to Gemini?

✅ **Free Tier**: Generous free usage limits  
✅ **Fast**: Quick response times  
✅ **Smart**: Excellent code generation capabilities  
✅ **No Subscription**: No need for OpenAI Plus  
✅ **Google Quality**: Backed by Google's AI research  

## Troubleshooting

### "Google AI API key not configured"
- Make sure you've set the API key in VS Code settings
- Check that you've selected "gemini" as the provider

### "Invalid Google AI API key"
- Verify your API key is correct (no extra spaces)
- Make sure the API key is active in Google AI Studio

### "Quota exceeded"
- Check your usage in Google AI Studio
- Free tier has generous limits, but they do exist

## Advanced Configuration

You can fine-tune Gemini's behavior:

```json
{
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "YOUR_API_KEY_HERE",
  "aiCodeGenerator.gemini.model": "gemini-pro",
  "aiCodeGenerator.temperature": 0.7,
  "aiCodeGenerator.maxTokens": 2048
}
```

### Available Models
- **gemini-pro**: Best for code generation (recommended)
- **gemini-pro-vision**: Supports images (for future features)

### Settings Explained
- **temperature**: Controls creativity (0.0 = focused, 1.0 = creative)
- **maxTokens**: Maximum length of responses

## All Features Work!

Once configured, all extension features work with Gemini:
- ✅ Generate Code
- ✅ Explain Code  
- ✅ Fix Code Issues
- ✅ Generate Tests
- ✅ Refactor Code
- ✅ Add Documentation
- ✅ AI Chat Interface

## Need Help?

If you run into issues:
1. Check the [gemini-setup.md](./gemini-setup.md) file for detailed setup
2. Verify your API key in Google AI Studio
3. Make sure you've saved your VS Code settings
4. Try restarting VS Code

**You're all set! Enjoy coding with Google Gemini! 🚀**