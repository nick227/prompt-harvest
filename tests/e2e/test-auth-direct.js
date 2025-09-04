/**
 * Direct Authentication API Test
 * Tests authentication endpoints directly without external dependencies
 */

console.log('🔐 Direct Authentication API Test\n');

const BASE_URL = 'http://localhost:3200';
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
    blue: '\x1b[34m',
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

// Test registration
async function testRegistration() {
    logStep('1', 'Testing user registration...');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: TEST_USER.email,
                password: TEST_USER.password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logSuccess(`User registered successfully: ${data.data.user.email}`);
            return true;
        } else if (data.message && data.message.includes('already exists')) {
            logWarning(`User ${TEST_USER.email} already exists`);
            return true;
        } else {
            logError(`Registration failed: ${data.message || response.statusText}`);
            return false;
        }

    } catch (error) {
        logError(`Registration error: ${error.message}`);
        return false;
    }
}

// Test login
async function testLogin() {
    logStep('2', 'Testing user login...');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: TEST_USER.email,
                password: TEST_USER.password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            logSuccess('Login successful');
            logInfo(`Token received: ${data.data.token.substring(0, 30)}...`);
            return data.data.token;
        } else {
            logError(`Login failed: ${data.message || response.statusText}`);
            return null;
        }

    } catch (error) {
        logError(`Login error: ${error.message}`);
        return null;
    }
}

// Test profile endpoint
async function testProfileEndpoint(token) {
    logStep('3', 'Testing profile endpoint with auth token...');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        logInfo(`Profile endpoint response: ${response.status} ${response.statusText}`);
        logInfo(`Response data:`, data);

        if (response.ok && data.success) {
            logSuccess('Profile endpoint working correctly');
            logInfo(`User email: ${data.data.user.email}`);
            return true;
        } else {
            logError(`Profile endpoint failed: ${data.message || response.statusText}`);
            logError(`Status: ${response.status}`);
            return false;
        }

    } catch (error) {
        logError(`Profile endpoint error: ${error.message}`);
        return false;
    }
}

// Test token validation
function validateToken(token) {
    logStep('4', 'Validating JWT token...');

    try {
        // Decode JWT payload (without verification)
        const parts = token.split('.');
        if (parts.length !== 3) {
            logError('Invalid JWT format');
            return false;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        logInfo('Token payload decoded:');
        logInfo(`  User ID: ${payload.userId}`);
        logInfo(`  Issued At: ${new Date(payload.iat * 1000).toLocaleString()}`);
        logInfo(`  Expires At: ${new Date(payload.exp * 1000).toLocaleString()}`);
        logInfo(`  Current Time: ${new Date().toLocaleString()}`);
        logInfo(`  Expired: ${Date.now() > payload.exp * 1000 ? 'Yes' : 'No'}`);

        if (Date.now() > payload.exp * 1000) {
            logWarning('Token has expired');
            return false;
        }

        logSuccess('Token is valid and not expired');
        return true;

    } catch (error) {
        logError(`Token validation error: ${error.message}`);
        return false;
    }
}

// Test unauthorized profile access
async function testUnauthorizedProfile() {
    logStep('5', 'Testing profile endpoint without token...');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        logInfo(`Unauthorized profile response: ${response.status} ${response.statusText}`);
        logInfo(`Response data:`, data);

        if (response.status === 401) {
            logSuccess('Profile endpoint correctly rejects unauthorized access');
            return true;
        } else {
            logWarning(`Unexpected response for unauthorized access: ${response.status}`);
            return false;
        }

    } catch (error) {
        logError(`Unauthorized profile test error: ${error.message}`);
        return false;
    }
}

// Main test execution
async function runTests() {
    log('🚀 Starting Direct Authentication API Tests', 'blue');
    log('==========================================\n', 'blue');

    try {
        // Test 1: Registration
        const registrationSuccess = await testRegistration();
        if (!registrationSuccess) {
            logError('Registration test failed. Cannot continue.');
            return false;
        }

        // Test 2: Login
        const token = await testLogin();
        if (!token) {
            logError('Login test failed. Cannot continue.');
            return false;
        }

        // Test 3: Token validation
        const tokenValid = validateToken(token);
        if (!tokenValid) {
            logWarning('Token validation failed, but continuing with tests...');
        }

        // Test 4: Profile endpoint with token
        const profileSuccess = await testProfileEndpoint(token);

        // Test 5: Unauthorized profile access
        const unauthorizedSuccess = await testUnauthorizedProfile();

        // Summary
        log('\n📊 Test Results Summary:', 'blue');
        log(`  Registration: ${registrationSuccess ? '✅ PASS' : '❌ FAIL'}`, registrationSuccess ? 'green' : 'red');
        log(`  Login: ${token ? '✅ PASS' : '❌ FAIL'}`, token ? 'green' : 'red');
        log(`  Token Validation: ${tokenValid ? '✅ PASS' : '⚠️  WARN'}`, tokenValid ? 'green' : 'yellow');
        log(`  Profile with Token: ${profileSuccess ? '✅ PASS' : '❌ FAIL'}`, profileSuccess ? 'green' : 'red');
        log(`  Unauthorized Profile: ${unauthorizedSuccess ? '✅ PASS' : '❌ FAIL'}`, unauthorizedSuccess ? 'green' : 'red');

        if (profileSuccess) {
            log('\n🎉 All authentication tests passed!', 'green');
            log('The authentication persistence issue is likely in the frontend, not the backend.', 'blue');
        } else {
            log('\n💥 Authentication tests failed!', 'red');
            log('The issue is in the backend authentication. Check:', 'yellow');
            log('  1. JWT_SECRET environment variable', 'yellow');
            log('  2. Authentication middleware configuration', 'yellow');
            log('  3. Backend console logs for JWT errors', 'yellow');
        }

        return profileSuccess;

    } catch (error) {
        logError(`Test execution error: ${error.message}`);
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(error => {
        logError(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runTests, testRegistration, testLogin, testProfileEndpoint };
