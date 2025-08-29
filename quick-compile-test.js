#!/usr/bin/env node

const { exec } = require('child_process');

console.log('🔍 Testing TypeScript compilation...');

exec('npx tsc --noEmit', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Compilation failed:');
        console.error(stderr);
        console.error(stdout);
        process.exit(1);
    } else {
        console.log('✅ TypeScript compilation successful!');
        console.log('🎉 Ready to package with vsce!');
        
        // Now try the actual packaging
        console.log('\n📦 Attempting to package...');
        exec('npx vsce package', (packageError, packageStdout, packageStderr) => {
            if (packageError) {
                console.error('❌ Packaging failed:');
                console.error(packageStderr);
                console.error(packageStdout);
                process.exit(1);
            } else {
                console.log('✅ Packaging successful!');
                console.log(packageStdout);
                console.log('\n🚀 Extension is ready for deployment!');
            }
        });
    }
});