// Simple test to verify the extension fixes
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing AI Code Generator Extension Fixes...\n');

// Test 1: Check if media directory exists
console.log('1. Checking media directory...');
if (fs.existsSync('./media')) {
    console.log('   ✅ Media directory exists');
} else {
    console.log('   ❌ Media directory missing');
}

// Test 2: Check if dashboard provider exists and is valid
console.log('\n2. Checking dashboard provider...');
if (fs.existsSync('./src/ui/dashboardProvider.ts')) {
    const content = fs.readFileSync('./src/ui/dashboardProvider.ts', 'utf8');
    if (content.includes('inline styles') || !content.includes('styleUri')) {
        console.log('   ✅ Dashboard provider fixed (no external CSS references)');
    } else {
        console.log('   ⚠️  Dashboard provider may still reference external files');
    }
} else {
    console.log('   ❌ Dashboard provider missing');
}

// Test 3: Check if configuration checker exists
console.log('\n3. Checking configuration checker...');
if (fs.existsSync('./src/configurationChecker.ts')) {
    console.log('   ✅ Configuration checker exists');
} else {
    console.log('   ❌ Configuration checker missing');
}

// Test 4: Check if TypeScript compiles
console.log('\n4. Checking TypeScript compilation...');
try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('   ✅ TypeScript compiles without errors');
} catch (error) {
    console.log('   ⚠️  TypeScript compilation issues detected');
    console.log('   Run "npm run compile" to see details');
}

// Test 5: Check if package.json has required dependencies
console.log('\n5. Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const requiredDeps = ['@google/generative-ai', 'axios', 'openai'];
const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

if (missingDeps.length === 0) {
    console.log('   ✅ All required dependencies present');
} else {
    console.log(`   ⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
}

// Test 6: Check if views are properly configured
console.log('\n6. Checking view configuration...');
const views = packageJson.contributes?.views?.aiCodeGenerator;
if (views && views.length >= 2) {
    const hasChat = views.some(v => v.id === 'aiCodeGenerator.chatView');
    const hasDashboard = views.some(v => v.id === 'aiCodeGenerator.dashboard');
    
    if (hasChat && hasDashboard) {
        console.log('   ✅ Both dashboard and chat views configured');
    } else {
        console.log('   ⚠️  Missing view configurations');
    }
} else {
    console.log('   ❌ Views not properly configured');
}

console.log('\n🎯 Test Summary:');
console.log('If all tests show ✅, the extension should work properly.');
console.log('If you see ⚠️ or ❌, check the specific issues mentioned.');
console.log('\n📋 Next Steps:');
console.log('1. Run "npm run compile" to build the extension');
console.log('2. Configure an AI provider API key in VS Code settings');
console.log('3. Test the dashboard and chat views');
console.log('\n🚀 Happy coding with AI assistance!');