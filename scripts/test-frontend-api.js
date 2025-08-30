/**
 * Test script to validate frontend API integration with backend refactors
 * Tests user operations and image generation with the new centralized API service
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3200';

// Test configuration
const TEST_CONFIG = {
    baseUrl: BASE_URL,
    timeout: 10000,
    retries: 2
};

// Test data
const TEST_USER = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    confirmPassword: 'testpassword123'
};

const TEST_IMAGE = {
    prompt: 'a beautiful sunset over mountains, digital art',
    providers: ['flux'],
    guidance: 10
};

class FrontendApiTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.authToken = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runTest(name, testFn) {
        this.log(`🧪 Running test: ${name}`);
        const startTime = Date.now();

        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASSED', duration });
            this.log(`✅ ${name} passed (${duration}ms)`, 'success');
        } catch (error) {
            const duration = Date.now() - startTime;
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAILED', duration, error: error.message });
            this.log(`❌ ${name} failed: ${error.message}`, 'error');
        }
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: TEST_CONFIG.timeout
        };

        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        if (this.authToken) {
            requestOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const response = await fetch(url, requestOptions);

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const error = new Error(data.error || data.message || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return { response, data };
    }

    // Test user registration
    async testUserRegistration() {
        const { data } = await this.makeRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(TEST_USER)
        });

        if (!data.success) {
            throw new Error('Registration failed: ' + (data.error || 'Unknown error'));
        }

        if (data.data.token) {
            this.authToken = data.data.token;
        }

        return data;
    }

    // Test user login
    async testUserLogin() {
        const { data } = await this.makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: TEST_USER.email,
                password: TEST_USER.password
            })
        });

        if (!data.success) {
            throw new Error('Login failed: ' + (data.error || 'Unknown error'));
        }

        if (data.data.token) {
            this.authToken = data.data.token;
        }

        return data;
    }

    // Test user profile
    async testUserProfile() {
        const { data } = await this.makeRequest('/api/auth/profile');

        if (!data.success) {
            throw new Error('Profile fetch failed: ' + (data.error || 'Unknown error'));
        }

        if (data.data.user.email !== TEST_USER.email) {
            throw new Error('Profile email mismatch');
        }

        return data;
    }

    // Test image generation
    async testImageGeneration() {
        const { data } = await this.makeRequest('/api/image/generate', {
            method: 'POST',
            body: JSON.stringify(TEST_IMAGE)
        });

        if (!data.success) {
            throw new Error('Image generation failed: ' + (data.error || 'Unknown error'));
        }

        if (!data.data || !data.data.id) {
            throw new Error('Image generation response missing required fields');
        }

        return data;
    }

    // Test image rating
    async testImageRating(imageId) {
        const { data } = await this.makeRequest(`/api/images/${imageId}/rating`, {
            method: 'POST',
            body: JSON.stringify({ rating: 5 })
        });

        if (!data.success) {
            throw new Error('Image rating failed: ' + (data.error || 'Unknown error'));
        }

        return data;
    }

    // Test image retrieval
    async testImageRetrieval(imageId) {
        const { data } = await this.makeRequest(`/api/images/${imageId}`);

        if (!data.success) {
            throw new Error('Image retrieval failed: ' + (data.error || 'Unknown error'));
        }

        if (!data.data || data.data.id !== imageId) {
            throw new Error('Image retrieval returned wrong image');
        }

        return data;
    }

    // Test image statistics
    async testImageStats() {
        const { data } = await this.makeRequest('/api/images/stats');

        if (!data.success) {
            throw new Error('Image stats failed: ' + (data.error || 'Unknown error'));
        }

        if (typeof data.data.count !== 'number') {
            throw new Error('Image stats missing count field');
        }

        return data;
    }

    // Test user logout
    async testUserLogout() {
        const { data } = await this.makeRequest('/api/auth/logout', {
            method: 'POST'
        });

        if (!data.success) {
            throw new Error('Logout failed: ' + (data.error || 'Unknown error'));
        }

        this.authToken = null;
        return data;
    }

    // Test validation errors
    async testValidationErrors() {
        // Test invalid email
        try {
            await this.makeRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: 'invalid-email',
                    password: 'test123'
                })
            });
            throw new Error('Should have failed with invalid email');
        } catch (error) {
            if (error.status !== 400) {
                throw new Error('Expected 400 status for invalid email');
            }
        }

        // Test short password
        try {
            await this.makeRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: '123'
                })
            });
            throw new Error('Should have failed with short password');
        } catch (error) {
            if (error.status !== 400) {
                throw new Error('Expected 400 status for short password');
            }
        }

        // Test empty prompt
        try {
            await this.makeRequest('/api/image/generate', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: '',
                    providers: ['flux'],
                    guidance: 10
                })
            });
            throw new Error('Should have failed with empty prompt');
        } catch (error) {
            if (error.status !== 400) {
                throw new Error('Expected 400 status for empty prompt');
            }
        }
    }

    // Test rate limiting
    async testRateLimiting() {
        const requests = [];

        // Make multiple rapid requests
        for (let i = 0; i < 15; i++) {
            requests.push(
                this.makeRequest('/api/image/generate', {
                    method: 'POST',
                    body: JSON.stringify({
                        prompt: `test prompt ${i}`,
                        providers: ['flux'],
                        guidance: 10
                    })
                }).catch(error => error)
            );
        }

        const results = await Promise.all(requests);
        const rateLimited = results.filter(result => result.status === 429);

        if (rateLimited.length === 0) {
            this.log('⚠️ Rate limiting not triggered (this might be expected)', 'warning');
        } else {
            this.log(`✅ Rate limiting working: ${rateLimited.length} requests were rate limited`, 'success');
        }
    }

    async runAllTests() {
        this.log('🚀 Starting Frontend API Integration Tests');
        this.log(`🌐 Testing against: ${TEST_CONFIG.baseUrl}`);
        console.log('='.repeat(60));

        // User authentication tests
        await this.runTest('User Registration', () => this.testUserRegistration());
        await this.runTest('User Login', () => this.testUserLogin());
        await this.runTest('User Profile', () => this.testUserProfile());

        // Image generation tests
        await this.runTest('Image Generation', () => this.testImageGeneration());

        // Get the generated image ID for further tests
        let imageId;
        try {
            const { data } = await this.makeRequest('/api/images?limit=1');
            if (data.success && data.data.length > 0) {
                imageId = data.data[0].id;
            }
        } catch (error) {
            this.log('⚠️ Could not get image ID for rating test', 'warning');
        }

        if (imageId) {
            await this.runTest('Image Rating', () => this.testImageRating(imageId));
            await this.runTest('Image Retrieval', () => this.testImageRetrieval(imageId));
        }

        await this.runTest('Image Statistics', () => this.testImageStats());

        // Error handling tests
        await this.runTest('Validation Errors', () => this.testValidationErrors());
        await this.runTest('Rate Limiting', () => this.testRateLimiting());

        // Cleanup
        await this.runTest('User Logout', () => this.testUserLogout());

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🧪 FRONTEND API INTEGRATION TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`📊 Total Tests: ${this.results.passed + this.results.failed}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));

        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`  • ${test.name}: ${test.error}`);
                });
        }

        console.log('\n📋 DETAILED RESULTS:');
        this.results.tests.forEach(test => {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            console.log(`  ${status} ${test.name} (${test.duration}ms)`);
        });

        if (this.results.failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
}

// Run tests if this script is executed directly
if (process.argv[1] && process.argv[1].endsWith('test-frontend-api.js')) {
    const tester = new FrontendApiTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}
