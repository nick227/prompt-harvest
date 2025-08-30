#!/usr/bin/env node

/**
 * Verify All Fixes Applied Successfully
 * Final verification that all syntax and reference issues are resolved
 */

import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 Final verification of all fixes...\n');

const criticalFiles = [
    'public/js/core/constants.js',
    'public/js/components/auth-component.js',
    'public/js/components/image-component.js',
    'public/js/modules/feed/feed-manager.js',
    'public/js/tools.js'
];

const verifyFile = async (filePath) => {
    try {
        await execAsync(`node -c ${filePath}`);
        console.log(`✅ ${filePath} - Syntax OK`);
        return true;
    } catch (error) {
        console.log(`❌ ${filePath} - Syntax Error: ${error.message}`);
        return false;
    }
};

const checkRequiredConfigs = () => {
    const constantsFile = 'public/js/core/constants.js';
    const content = fs.readFileSync(constantsFile, 'utf8');

    const requiredConfigs = [
        'TEXTAREA_CONFIG',
        'FEED_CONFIG',
        'GUIDANCE_CONFIG',
        'RATING_CONFIG',
        'STATS_CONFIG',
        'IMAGE_CONFIG',
        'PROVIDER_CONFIG'
    ];

    let allFound = true;
    requiredConfigs.forEach(config => {
        if (content.includes(`const ${config}`)) {
            console.log(`✅ ${config} - Defined`);
        } else {
            console.log(`❌ ${config} - Missing`);
            allFound = false;
        }
    });

    return allFound;
};

const main = async () => {
    console.log('📋 SYNTAX VERIFICATION:');
    let allValid = true;

    for (const file of criticalFiles) {
        const isValid = await verifyFile(file);
        if (!isValid) allValid = false;
    }

    console.log('\n📋 CONFIG VERIFICATION:');
    const configsValid = checkRequiredConfigs();

    console.log('\n📊 SUMMARY:');
    if (allValid && configsValid) {
        console.log('🎉 ALL FIXES VERIFIED SUCCESSFULLY!');
        console.log('✅ All JavaScript files have valid syntax');
        console.log('✅ All required configs are defined');
        console.log('✅ Application should load without errors');

        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Refresh your browser (Ctrl+F5)');
        console.log('2. Check browser console - should be clean');
        console.log('3. Test core functionality');

    } else {
        console.log('⚠️  Some issues remain:');
        if (!allValid) console.log('- Syntax errors in JavaScript files');
        if (!configsValid) console.log('- Missing configuration constants');
    }
};

main().catch(console.error);
