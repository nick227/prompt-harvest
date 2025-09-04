#!/usr/bin/env node

/**
 * Authentication Test Runner
 * Runs the authentication persistence tests with detailed logging
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔐 Starting Authentication Persistence Tests...\n');

// Test configuration
const TEST_CONFIG = {
    testFile: path.join(__dirname, 'auth-persistence.test.js'),
    playwrightConfig: path.join(__dirname, '..', '..', 'playwright.config.js'),
    timeout: 120000 // 2 minutes
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
    log(`\n${step} ${description}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// Check if backend server is running
function checkBackendServer() {
    logStep('1', 'Checking backend server status...');

    try {
        const response = execSync('curl -s http://localhost:3200', {
            encoding: 'utf8',
            timeout: 5000
        });

        if (response.includes('AutoImage') || response.length > 0) {
            logSuccess('Backend server is running on port 3200');
            return true;
        }
    } catch (error) {
        logWarning('Backend server not responding on port 3200');
        return false;
    }

    return false;
}

// Check if test user exists
function checkTestUser() {
    logStep('2', 'Checking test user availability...');

    try {
        // This would ideally check the database, but for now we'll assume the user exists
        logInfo('Test user: test@example.com (you may need to create this user first)');
        logWarning('Make sure test@example.com exists in your database with password: testpassword123');
        return true;
    } catch (error) {
        logError('Could not verify test user');
        return false;
    }
}

// Run the tests
function runTests() {
    logStep('3', 'Running authentication persistence tests...');

    try {
        const command = `npx playwright test "${TEST_CONFIG.testFile}" --config="${TEST_CONFIG.playwrightConfig}" --timeout=${TEST_CONFIG.timeout} --reporter=list`;

        logInfo(`Executing: ${command}`);
        logInfo('This may take a few minutes...\n');

        const result = execSync(command, {
            encoding: 'utf8',
            timeout: TEST_CONFIG.timeout,
            stdio: 'inherit'
        });

        logSuccess('All tests completed successfully!');
        return true;

    } catch (error) {
        logError('Tests failed or timed out');
        logError(`Error: ${error.message}`);
        return false;
    }
}

// Generate test report
function generateReport() {
    logStep('4', 'Generating test report...');

    try {
        const reportCommand = `npx playwright show-report`;
        logInfo('Opening test report...');

        execSync(reportCommand, { stdio: 'inherit' });
        logSuccess('Test report opened');

    } catch (error) {
        logWarning('Could not open test report automatically');
        logInfo('You can manually open the report with: npx playwright show-report');
    }
}

// Main execution
async function main() {
    log('🚀 Authentication Persistence Test Suite', 'bright');
    log('==========================================\n', 'bright');

    // Pre-flight checks
    const serverRunning = checkBackendServer();
    const userExists = checkTestUser();

    if (!serverRunning) {
        logError('Please start your backend server first: npm start');
        logError('Then run this test suite again');
        process.exit(1);
    }

    if (!userExists) {
        logWarning('Test user may not exist. Tests may fail.');
        logInfo('Consider creating test@example.com with password: testpassword123');
    }

    // Run tests
    const testsPassed = runTests();

    if (testsPassed) {
        log('\n🎉 All authentication tests passed!', 'green');
        generateReport();
    } else {
        log('\n💥 Some tests failed. Check the output above for details.', 'red');
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    log('\n\n⚠️  Tests interrupted by user', 'yellow');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('\n\n⚠️  Tests terminated', 'yellow');
    process.exit(0);
});

// Run the main function
if (require.main === module) {
    main().catch(error => {
        logError(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { main, checkBackendServer, checkTestUser };
