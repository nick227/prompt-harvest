#!/usr/bin/env node

/**
 * Pre-commit Hook - Run critical checks before allowing commits
 * Prevents commits with undefined variables and other critical issues
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🔒 Running pre-commit checks...\n');

const checks = [
    {
        name: 'Critical Lint Issues',
        command: 'node scripts/strict-lint-check.js',
        required: true
    },
    {
        name: 'Syntax Check',
        command: 'node -c public/js/app.js',
        required: true
    },
    {
        name: 'Unit Tests',
        command: 'npm run test:unit',
        required: false // Optional since we have canvas issues
    }
];

let failedChecks = 0;
let passedChecks = 0;

for (const check of checks) {
    try {
        console.log(`🔍 ${check.name}...`);
        execSync(check.command, { stdio: 'pipe' });
        console.log(`✅ ${check.name} passed\n`);
        passedChecks++;
    } catch (error) {
        console.log(`❌ ${check.name} failed`);
        if (check.required) {
            console.log(`   Error: ${error.message}`);
            failedChecks++;
        } else {
            console.log(`   Warning: ${error.message} (non-blocking)`);
        }
        console.log('');
    }
}

console.log(`📊 Pre-commit Summary:`);
console.log(`   Passed: ${passedChecks}`);
console.log(`   Failed: ${failedChecks}`);

if (failedChecks > 0) {
    console.log(`\n🚫 COMMIT BLOCKED: Fix critical issues before committing.`);
    console.log(`   Run 'node scripts/strict-lint-check.js' to see details.`);
    process.exit(1);
} else {
    console.log(`\n✅ All critical checks passed! Commit allowed.`);
}
