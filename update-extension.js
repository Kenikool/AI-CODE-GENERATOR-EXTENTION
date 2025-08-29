#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 AI Code Generator Extension Update Helper\n');

// Read current package.json
const packagePath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`📦 Current version: ${currentVersion}`);

// Function to increment version
function incrementVersion(version, type = 'patch') {
    const parts = version.split('.').map(Number);
    
    switch (type) {
        case 'major':
            return `${parts[0] + 1}.0.0`;
        case 'minor':
            return `${parts[0]}.${parts[1] + 1}.0`;
        case 'patch':
        default:
            return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    }
}

// Suggest new version
const suggestedVersion = incrementVersion(currentVersion, 'patch');
console.log(`💡 Suggested new version: ${suggestedVersion} (patch update for bug fixes)`);

console.log('\n🔧 Update Process:');
console.log('1. Update version in package.json');
console.log('2. Compile TypeScript');
console.log('3. Package extension');
console.log('4. Publish to marketplace');

console.log('\n📋 Manual Steps Required:');
console.log(`1. Edit package.json and change version from "${currentVersion}" to "${suggestedVersion}"`);
console.log('2. Run the following commands:');
console.log('');
console.log('   npm run compile');
console.log('   npm run package');
console.log('   npm run publish');
console.log('');
console.log('   OR use the all-in-one command:');
console.log('   npm run deploy:full');

console.log('\n✨ What This Update Includes:');
console.log('- ✅ Fixed empty dashboard and AI chat views');
console.log('- ✅ Added configuration wizard for API key setup');
console.log('- ✅ Better error handling and user guidance');
console.log('- ✅ Improved onboarding experience');

console.log('\n📝 Release Notes Template:');
console.log('---');
console.log(`## Version ${suggestedVersion} - Bug Fixes & Improvements`);
console.log('');
console.log('### 🐛 Fixed');
console.log('- Dashboard and AI chat now display content properly');
console.log('- Resolved missing dependencies causing empty views');
console.log('- Fixed HTML generation errors');
console.log('');
console.log('### ✨ Added');
console.log('- Configuration wizard for easy API key setup');
console.log('- Better error messages and user guidance');
console.log('- Automatic setup prompts for new users');
console.log('');
console.log('### 🔧 Improved');
console.log('- Enhanced error handling throughout extension');
console.log('- Better user onboarding experience');
console.log('- More reliable dashboard rendering');
console.log('---');

console.log('\n🎯 Quick Update Commands:');
console.log('');
console.log('# Step 1: Update package.json version manually');
console.log(`# Change "version": "${currentVersion}" to "version": "${suggestedVersion}"`);
console.log('');
console.log('# Step 2: Build and publish');
console.log('npm run deploy:full');
console.log('');
console.log('# OR step by step:');
console.log('npm run compile');
console.log('npm run package');
console.log('npm run publish');

console.log('\n⚠️  Important Notes:');
console.log('- Make sure you have vsce installed: npm install -g @vscode/vsce');
console.log('- Ensure you\'re logged in: vsce login KENIKOOL-TECH');
console.log('- Test locally before publishing');
console.log('- Version numbers must be unique (can\'t republish same version)');

console.log('\n🎉 After publishing, your users will get:');
console.log('- Working dashboard with project information');
console.log('- Functional AI chat interface');
console.log('- Setup wizard for API configuration');
console.log('- Better error messages and guidance');

console.log('\n✅ Ready to update your extension!');