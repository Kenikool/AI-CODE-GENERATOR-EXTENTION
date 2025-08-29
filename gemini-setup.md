# Google Gemini Setup Guide

## Getting Started with Google Gemini

To use Google Gemini instead of OpenAI, follow these steps:

### 1. Get a Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure VS Code Settings

1. Open VS Code Settings (Ctrl+, or Cmd+,)
2. Search for "AI Code Generator"
3. Set the following configurations:

```json
{
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "YOUR_GOOGLE_AI_API_KEY_HERE",
  "aiCodeGenerator.gemini.model": "gemini-pro"
}
```

### 3. Available Gemini Models

- **gemini-pro**: Best for text-based tasks (recommended for code generation)
- **gemini-pro-vision**: Supports both text and images

### 4. Optional Settings

You can also configure:

```json
{
  "aiCodeGenerator.maxTokens": 2048,
  "aiCodeGenerator.temperature": 0.7
}
```

### 5. Test the Setup

1. Open any code file
2. Use Ctrl+Shift+P (or Cmd+Shift+P) to open the command palette
3. Type "AI Code Generator: Generate Code"
4. Enter a prompt like "Create a hello world function"

If everything is configured correctly, Gemini will generate code for you!

## Troubleshooting

- **"Google AI API key not configured"**: Make sure you've set the API key in VS Code settings
- **"Invalid Google AI API key"**: Verify your API key is correct and active
- **"Quota exceeded"**: Check your Google AI usage limits

## Benefits of Using Gemini

- Free tier available with generous limits
- Fast response times
- Good code generation capabilities
- No need for OpenAI subscription