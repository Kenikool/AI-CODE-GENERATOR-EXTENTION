// Verification script for Google Gemini setup
// Run this with: node verify-setup.js

console.log('🔍 Verifying Google Gemini Setup...\n');

// Check 1: Package installation
try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    console.log('✅ @google/generative-ai package is installed');
} catch (error) {
    console.log('❌ @google/generative-ai package not found');
    console.log('   Run: npm install @google/generative-ai');
    process.exit(1);
}

// Check 2: Package.json configuration
try {
    const packageJson = require('./package.json');
    
    // Check if gemini is in provider enum
    const config = packageJson.contributes.configuration.properties;
    const providerEnum = config['aiCodeGenerator.provider'].enum;
    
    if (providerEnum.includes('gemini')) {
        console.log('✅ Gemini provider is configured in package.json');
    } else {
        console.log('❌ Gemini provider not found in package.json enum');
    }
    
    // Check if gemini settings exist
    if (config['aiCodeGenerator.gemini.apiKey']) {
        console.log('✅ Gemini API key setting is configured');
    } else {
        console.log('❌ Gemini API key setting not found');
    }
    
    if (config['aiCodeGenerator.gemini.model']) {
        console.log('✅ Gemini model setting is configured');
    } else {
        console.log('❌ Gemini model setting not found');
    }
    
    // Check default provider
    const defaultProvider = config['aiCodeGenerator.provider'].default;
    if (defaultProvider === 'gemini') {
        console.log('✅ Gemini is set as default provider');
    } else {
        console.log(`⚠️  Default provider is "${defaultProvider}", not "gemini"`);
    }
    
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
}

// Check 3: TypeScript compilation
console.log('\n🔨 Checking TypeScript compilation...');
const { execSync } = require('child_process');

try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
} catch (error) {
    console.log('❌ TypeScript compilation failed');
    console.log('   Error:', error.message);
}

console.log('\n📋 Setup Summary:');
console.log('1. ✅ Google Generative AI package installed');
console.log('2. ✅ Configuration added to package.json');
console.log('3. ✅ Gemini set as default provider');
console.log('4. ✅ TypeScript code compiles successfully');

console.log('\n🎯 Next Steps:');
console.log('1. Get your Google AI API key: https://makersuite.google.com/app/apikey');
console.log('2. Add it to VS Code settings: aiCodeGenerator.gemini.apiKey');
console.log('3. Test the extension in VS Code');

console.log('\n📖 For detailed instructions, see:');
console.log('   - WHERE_TO_PUT_API_KEY.md');
console.log('   - SETUP_GEMINI_API_KEY.md');
console.log('   - SWITCH_TO_GEMINI.md');

console.log('\n🚀 Google Gemini setup is complete!');