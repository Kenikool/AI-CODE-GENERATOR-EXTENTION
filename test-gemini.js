// Test script to verify Google Gemini integration
// Run this with: node test-gemini.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiConnection() {
    console.log('🧪 Testing Google Gemini Integration...\n');
    
    // Check if the package is installed
    try {
        console.log('✅ @google/generative-ai package is available');
    } catch (error) {
        console.log('❌ @google/generative-ai package not found');
        console.log('Run: npm install @google/generative-ai');
        return;
    }
    
    // Test API key format (you'll need to add your real key)
    const testApiKey = 'YOUR_API_KEY_HERE';
    
    if (testApiKey === 'YOUR_API_KEY_HERE') {
        console.log('⚠️  Please add your Google AI API key to test the connection');
        console.log('Get your API key from: https://makersuite.google.com/app/apikey');
        return;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(testApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        console.log('🔄 Testing connection to Gemini...');
        
        const result = await model.generateContent("Say 'Hello from Gemini!' in a single line");
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Gemini connection successful!');
        console.log('📝 Response:', text);
        
    } catch (error) {
        console.log('❌ Gemini connection failed:', error.message);
        
        if (error.message.includes('API_KEY_INVALID')) {
            console.log('💡 Check your API key is correct');
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            console.log('💡 API quota exceeded');
        }
    }
}

testGeminiConnection();