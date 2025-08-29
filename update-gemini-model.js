// Script to help update Gemini model settings
console.log('🔧 Gemini Model Update Helper\n');

console.log('❌ OLD MODEL (deprecated):');
console.log('   "aiCodeGenerator.gemini.model": "gemini-pro"');
console.log('');

console.log('✅ NEW MODELS (current):');
console.log('   "aiCodeGenerator.gemini.model": "gemini-1.5-flash"    (recommended - fast)');
console.log('   "aiCodeGenerator.gemini.model": "gemini-1.5-pro"      (more capable)');
console.log('   "aiCodeGenerator.gemini.model": "gemini-2.0-flash-exp" (experimental)');
console.log('');

console.log('🎯 RECOMMENDED VS CODE SETTINGS:');
console.log(JSON.stringify({
  "aiCodeGenerator.provider": "gemini",
  "aiCodeGenerator.gemini.apiKey": "YOUR_API_KEY_HERE",
  "aiCodeGenerator.gemini.model": "gemini-1.5-flash",
  "aiCodeGenerator.temperature": 0.7,
  "aiCodeGenerator.maxTokens": 2048
}, null, 2));

console.log('\n📝 HOW TO UPDATE:');
console.log('1. Press Ctrl+Shift+P in VS Code');
console.log('2. Type "Preferences: Open Settings (JSON)"');
console.log('3. Change "gemini-pro" to "gemini-1.5-flash"');
console.log('4. Save the file');
console.log('');

console.log('🚀 The model error will be fixed!');