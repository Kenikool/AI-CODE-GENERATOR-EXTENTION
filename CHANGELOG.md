# Changelog

All notable changes to the AI Code Generator extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-12-19

### 🐛 Fixed
- Fixed dashboard displaying empty content after installation
- Fixed AI chat interface showing blank screen
- Resolved missing media directory causing HTML generation errors
- Fixed external CSS/JS file references that were causing loading failures

### ✨ Added
- Configuration wizard to guide users through API key setup
- Automatic setup prompts for new users on first activation
- Configuration checker with connection testing
- Better error messages when AI providers aren't configured
- Setup guidance with direct links to API key registration pages

### 🔧 Improved
- Dashboard now uses inline styles for better reliability (no external dependencies)
- Enhanced error handling throughout the extension
- Better user onboarding experience with clear setup instructions
- Graceful fallbacks when services are unavailable
- More informative error messages instead of silent failures

### 🎯 Technical Changes
- Rewrote dashboard provider to eliminate external file dependencies
- Added comprehensive error handling in webview providers
- Created configuration validation and testing system
- Improved dependency initialization and fallback handling

## [1.0.0] - 2024-12-18

### 🎉 Initial Release
- AI-powered code generation with multiple provider support
- Interactive dashboard with project health monitoring
- AI chat interface for coding assistance
- 35+ commands for various development tasks
- Support for OpenAI, Google Gemini, Anthropic Claude, Qodo, and Ollama
- Project scaffolding and analysis features
- Smart file and folder creation
- Codebase analysis and optimization tools
- Subscription and credit management system

### 🤖 AI Providers Supported
- **Google Gemini** - Fast and free tier available
- **OpenAI GPT** - High quality responses
- **Anthropic Claude** - Excellent reasoning capabilities
- **Qodo** - Specialized for code analysis
- **Ollama** - Local AI models

### 🛠️ Core Features
- Code generation from natural language
- Code explanation and documentation
- Bug fixing and code improvement
- Unit test generation
- Code refactoring assistance
- Project health monitoring
- Security and performance analysis
- Complete project generation from descriptions

---

## Version History

- **1.0.1** - Bug fixes and improved user experience
- **1.0.0** - Initial release with full feature set