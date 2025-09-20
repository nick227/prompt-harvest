#!/usr/bin/env node

/**
 * Strict Lint Check - Fail fast on critical errors
 * Filters out noise to focus on critical issues like undefined variables
 */

import { execSync } from 'child_process';

const CRITICAL_RULES = [
    'no-undef',           // Undefined variables (like our container issue)
    'no-unused-vars',     // Unused variables
    'no-redeclare',       // Variable redeclaration
    'no-dupe-keys',       // Duplicate object keys
    'no-unreachable',     // Unreachable code
];

console.log('🔍 Running strict lint check for critical errors...\n');

try {
    // Run ESLint with JSON output
    const result = execSync('npx eslint public/js/**/*.js --format json', {
        encoding: 'utf8',
        stdio: 'pipe'
    });

    const lintResults = JSON.parse(result);
    let criticalErrors = 0;
    let totalErrors = 0;

    lintResults.forEach(file => {
        if (file.messages.length > 0) {
            const criticalMessages = file.messages.filter(msg =>
                CRITICAL_RULES.includes(msg.ruleId) && msg.severity === 2
            );

            totalErrors += file.messages.filter(msg => msg.severity === 2).length;

            if (criticalMessages.length > 0) {
                console.log(`❌ ${file.filePath.replace(process.cwd(), '.')}`);
                criticalMessages.forEach(msg => {
                    console.log(`   Line ${msg.line}: ${msg.message} (${msg.ruleId})`);
                    criticalErrors++;
                });
                console.log('');
            }
        }
    });

    console.log(`📊 SUMMARY:`);
    console.log(`   Critical Errors: ${criticalErrors}`);
    console.log(`   Total Errors: ${totalErrors}`);
    console.log(`   Files Checked: ${lintResults.length}`);

    if (criticalErrors > 0) {
        console.log(`\n🚨 CRITICAL ERRORS FOUND! These must be fixed before proceeding.`);
        process.exit(1);
    } else {
        console.log(`\n✅ No critical errors found!`);
        if (totalErrors > 0) {
            console.log(`   Note: ${totalErrors} non-critical lint issues remain.`);
        }
    }

} catch (error) {
    // ESLint returns non-zero exit code when errors found
    if (error.stdout) {
        console.log('🔍 Processing lint results from error output...');
        const lintResults = JSON.parse(error.stdout);
        let criticalErrors = 0;
        let totalErrors = 0;

        lintResults.forEach(file => {
            if (file.messages.length > 0) {
                const criticalMessages = file.messages.filter(msg =>
                    CRITICAL_RULES.includes(msg.ruleId) && msg.severity === 2
                );

                totalErrors += file.messages.filter(msg => msg.severity === 2).length;

                if (criticalMessages.length > 0) {
                    console.log(`❌ ${file.filePath.replace(process.cwd(), '.')}`);
                    criticalMessages.forEach(msg => {
                        console.log(`   Line ${msg.line}: ${msg.message} (${msg.ruleId})`);
                        criticalErrors++;
                    });
                    console.log('');
                }
            }
        });

        console.log(`📊 SUMMARY:`);
        console.log(`   Critical Errors: ${criticalErrors}`);
        console.log(`   Total Errors: ${totalErrors}`);
        console.log(`   Files Checked: ${lintResults.length}`);

        if (criticalErrors > 0) {
            console.log(`\n🚨 CRITICAL ERRORS FOUND! These must be fixed before proceeding.`);
            process.exit(1);
        } else {
            console.log(`\n✅ No critical errors found!`);
            if (totalErrors > 0) {
                console.log(`   Note: ${totalErrors} non-critical lint issues remain.`);
            }
        }
    } else {
        console.error('❌ Failed to run ESLint:', error.message);
        process.exit(1);
    }
}
