#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking TypeScript compilation...');

// Check if tsconfig.json exists
if (!fs.existsSync('tsconfig.json')) {
    console.error('❌ tsconfig.json not found');
    process.exit(1);
}

// Run TypeScript compilation
exec('npx tsc --noEmit', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ TypeScript compilation failed:');
        console.error(stderr);
        console.error(stdout);
        process.exit(1);
    } else {
        console.log('✅ TypeScript compilation successful!');
        console.log('📦 Ready for packaging and deployment');
        
        // Check if all required files exist
        const requiredFiles = [
            'src/extension.ts',
            'src/aiProvider.ts',
            'src/codeGenerator.ts',
            'src/advancedScanner.ts',
            'src/debuggingAssistant.ts',
            'src/enhancedAutocomplete.ts',
            'src/subscription/subscriptionManager.ts',
            'src/subscription/paymentProvider.ts',
            'src/ui/dashboardProvider.ts',
            'package.json',
            'README.md',
            'CHANGELOG.md'
        ];
        
        const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
        
        if (missingFiles.length > 0) {
            console.warn('⚠️  Missing files:');
            missingFiles.forEach(file => console.warn(`   - ${file}`));
        } else {
            console.log('✅ All required files present');
        }
        
        console.log('\n🚀 Extension is ready for deployment!');
        console.log('\nNext steps:');
        console.log('1. Run: npm run compile');
        console.log('2. Run: npm run package');
        console.log('3. Test locally: code --install-extension *.vsix');
        console.log('4. Publish: npm run publish');
    }
});