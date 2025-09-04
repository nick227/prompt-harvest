#!/usr/bin/env node

/**
 * Test User Setup Script
 * Creates a test user for authentication testing
 */

const { execSync } = require('child_process');

console.log('👤 Setting up test user for authentication tests...\n');

const TEST_USER = {
    email: 'test@example.com',
    password: 'testpassword123'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
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
    logInfo('Checking if backend server is running...');

    try {
        const response = execSync('curl -s http://localhost:3200', {
            encoding: 'utf8',
            timeout: 5000
        });

        if (response.includes('AutoImage') || response.length > 0) {
            logSuccess('Backend server is running');
            return true;
        }
    } catch (error) {
        logError('Backend server not responding on port 3200');
        return false;
    }

    return false;
}

// Create test user via registration API
function createTestUser() {
    logInfo('Creating test user via registration API...');

    try {
        const curlCommand = `curl -X POST http://localhost:3200/api/auth/register \
            -H "Content-Type: application/json" \
            -d '{"email":"${TEST_USER.email}","password":"${TEST_USER.password}"}'`;

        logInfo('Executing registration request...');

        const result = execSync(curlCommand, {
            encoding: 'utf8',
            timeout: 10000
        });

        const response = JSON.parse(result);

        if (response.success) {
            logSuccess(`Test user created successfully: ${TEST_USER.email}`);
            logInfo(`User ID: ${response.data.user.id}`);
            return true;
        } else {
            if (response.message && response.message.includes('already exists')) {
                logWarning(`Test user ${TEST_USER.email} already exists`);
                return true;
            } else {
                logError(`Failed to create test user: ${response.message}`);
                return false;
            }
        }

    } catch (error) {
        if (error.message.includes('already exists')) {
            logWarning(`Test user ${TEST_USER.email} already exists`);
            return true;
        }

        logError(`Error creating test user: ${error.message}`);
        return false;
    }
}

// Test login with the test user
function testLogin() {
    logInfo('Testing login with test user...');

    try {
        const curlCommand = `curl -X POST http://localhost:3200/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"email":"${TEST_USER.email}","password":"${TEST_USER.password}"}'`;

        const result = execSync(curlCommand, {
            encoding: 'utf8',
            timeout: 10000
        });

        const response = JSON.parse(result);

        if (response.success) {
            logSuccess('Login test successful');
            logInfo(`Token received: ${response.data.token.substring(0, 20)}...`);
            return true;
        } else {
            logError(`Login test failed: ${response.message}`);
            return false;
        }

    } catch (error) {
        logError(`Error testing login: ${error.message}`);
        return false;
    }
}

// Test profile endpoint with token
function testProfileEndpoint(token) {
    logInfo('Testing profile endpoint with auth token...');

    try {
        const curlCommand = `curl -X GET http://localhost:3200/api/auth/profile \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json"`;

        const result = execSync(curlCommand, {
            encoding: 'utf8',
            timeout: 10000
        });

        const response = JSON.parse(result);

        if (response.success) {
            logSuccess('Profile endpoint test successful');
            logInfo(`User email: ${response.data.user.email}`);
            return true;
        } else {
            logError(`Profile endpoint test failed: ${response.message}`);
            return false;
        }

    } catch (error) {
        logError(`Error testing profile endpoint: ${error.message}`);
        return false;
    }
}

// Main execution
async function main() {
    log('🚀 Test User Setup for Authentication Tests', 'blue');
    log('============================================\n', 'blue');

    // Check backend server
    if (!checkBackendServer()) {
        logError('Please start your backend server first: npm start');
        process.exit(1);
    }

    // Create test user
    const userCreated = createTestUser();
    if (!userCreated) {
        logError('Failed to create test user. Cannot continue.');
        process.exit(1);
    }

    // Test login
    const loginSuccess = testLogin();
    if (!loginSuccess) {
        logError('Login test failed. Check your backend authentication.');
        process.exit(1);
    }

    // Get token for profile test
    try {
        const loginResult = execSync(`curl -X POST http://localhost:3200/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"email":"${TEST_USER.email}","password":"${TEST_USER.password}"}'`, {
            encoding: 'utf8',
            timeout: 10000
        });

        const response = JSON.parse(loginResult);
        const token = response.data.token;

        // Test profile endpoint
        const profileSuccess = testProfileEndpoint(token);
        if (!profileSuccess) {
            logError('Profile endpoint test failed. This indicates the authentication issue.');
            logInfo('Check your backend logs for JWT verification errors.');
        }

    } catch (error) {
        logError(`Error getting token for profile test: ${error.message}`);
    }

    log('\n🎉 Test user setup completed!', 'green');
    log('You can now run the authentication tests with:', 'blue');
    log('node tests/e2e/run-auth-tests.js', 'yellow');
}

// Run the main function
if (require.main === module) {
    main().catch(error => {
        logError(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { main, createTestUser, testLogin, testProfileEndpoint };
