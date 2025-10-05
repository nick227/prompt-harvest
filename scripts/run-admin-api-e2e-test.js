#!/usr/bin/env node

/**
 * Admin API E2E Test Runner
 * Simple script to run the admin API E2E tests
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Admin API E2E Tests...\n');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_BASE_URL = 'http://localhost:3000';

// Run the E2E tests
const testProcess = spawn('npx', ['jest', 'tests/e2e/admin-api.test.js', '--verbose'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
});

testProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ Admin API E2E Tests completed successfully!');
    } else {
        console.log('\n❌ Admin API E2E Tests failed with exit code:', code);
        process.exit(code);
    }
});

testProcess.on('error', (error) => {
    console.error('❌ Error running E2E tests:', error);
    process.exit(1);
});
